const fetch = require('node-fetch');
const { ALIYUN_API_BASE, ALIYUN_API_KEY, getModel } = require('../config');
const { writeChunk } = require('../utils/stream');

/**
 * 调用阿里云 API（非流式，用于工具调用场景）
 * @param {Array} messages
 * @param {Object} [options]
 * @param {string} [options.model] - 指定模型，默认 qwen3.6-plus
 * @param {Object} [options.systemMessage] - 系统消息
 * @returns {Promise<string>}
 */
async function callLLMNonStream(messages, { model, systemMessage } = {}) {
  const apiMessages = systemMessage ? [systemMessage, ...messages] : messages;

  const response = await fetch(ALIYUN_API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ALIYUN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || getModel('qwen3.6-plus'),
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
 * 调用阿里云 API（Function Calling / Structured Output）
 * 返回完整的 message 对象，包含 content、tool_calls 等字段
 * @param {Array} messages
 * @param {Object} [options]
 * @param {string} [options.model] - 指定模型
 * @param {Object} [options.systemMessage] - 系统消息
 * @param {Array} [options.tools] - Function Calling 工具定义
 * @param {Object|string} [options.toolChoice] - 工具选择策略，如 'auto'、'required'、{ type:'function', function:{name:'xxx'} }
 * @param {Object} [options.responseFormat] - Structured Output，如 { type:'json_schema', json_schema:{...} }
 * @returns {Promise<Object>} 完整的 message 对象 { role, content, tool_calls?, ... }
 */
async function callLLMWithTools(messages, { model, systemMessage, tools, toolChoice, responseFormat } = {}) {
  const apiMessages = systemMessage ? [systemMessage, ...messages] : messages;

  const body = {
    model: model || getModel('qwen3.6-plus'),
    messages: apiMessages,
    stream: false
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    if (toolChoice) {
      body.tool_choice = toolChoice;
    }
  }

  if (responseFormat) {
    body.response_format = responseFormat;
  }

  const response = await fetch(ALIYUN_API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ALIYUN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message;
}

/**
 * 调用阿里云 API（流式，用于最终响应）
 * @param {Array} messages
 * @param {Object} res - Express response 对象
 * @param {Object} [options]
 * @param {string} [options.model] - 指定模型，默认 qwen3.6-plus
 * @returns {Promise<string>}
 */
async function callLLMStream(messages, res, { model, systemMessage } = {}) {
  const apiMessages = systemMessage ? [systemMessage, ...messages] : messages;

  const apiResponse = await fetch(ALIYUN_API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ALIYUN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || getModel('qwen3.6-plus'),
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

/**
 * 将已有文本逐 chunk 写给前端，模拟流式输出
 * 用于复用非流式调用的结果，避免重复请求 LLM
 */
function streamText(text, res) {
  const CHUNK_SIZE = 10;
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    writeChunk(res, { type: 'content', text: text.slice(i, i + CHUNK_SIZE) });
  }
}

module.exports = { callLLMNonStream, callLLMStream, callLLMWithTools, streamText };
