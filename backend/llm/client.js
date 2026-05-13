const fetch = require('node-fetch');
const { ALIYUN_API_BASE, ALIYUN_API_KEY, ALIYUN_MODEL, SYSTEM_MESSAGE } = require('../config');
const { writeChunk } = require('../utils/stream');

/**
 * 调用阿里云 API（非流式，用于工具调用场景）
 * @param {Array} messages
 * @returns {Promise<string>}
 */
async function callLLMNonStream(messages) {
  const apiMessages = [SYSTEM_MESSAGE, ...messages];

  const response = await fetch(ALIYUN_API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ALIYUN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: ALIYUN_MODEL,
      messages: apiMessages,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 调用阿里云 API（流式，用于最终响应）
 * @param {Array} messages
 * @param {Object} res - Express response 对象
 * @returns {Promise<string>}
 */
async function callLLMStream(messages, res) {
  const apiMessages = [SYSTEM_MESSAGE, ...messages];

  const apiResponse = await fetch(ALIYUN_API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ALIYUN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: ALIYUN_MODEL,
      messages: apiMessages,
      stream: true
    })
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    throw new Error(`LLM API error: ${apiResponse.status} ${errorText}`);
  }

  return new Promise((resolve, reject) => {
    let buffer = '';
    let fullContent = '';

    apiResponse.body.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            writeChunk(res, { type: 'content', text: content });
          }
        } catch (e) {
          // skip malformed SSE lines
        }
      }
    });

    apiResponse.body.on('end', () => resolve(fullContent));
    apiResponse.body.on('error', reject);
  });
}

module.exports = { callLLMNonStream, callLLMStream };
