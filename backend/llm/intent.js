const fetch = require('node-fetch');
const { ALIYUN_API_BASE, ALIYUN_API_KEY, ALIYUN_MODEL } = require('../config');
const { writeChunk } = require('../utils/stream');

/**
 * 意图理解模块（独立，不与其他模块耦合）
 * 输入：用户原始输入
 * 输出：仅向前端发送 [INTENT] chunk，不参与后续流程
 * @param {string} userInput
 * @param {Object} res - Express response 对象
 */
async function understandIntent(userInput, res) {
  if (!res || res.writableEnded) return;
  writeChunk(res, { type: 'intent', status: 'thinking' });

  try {
    const response = await fetch(ALIYUN_API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ALIYUN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: ALIYUN_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一个意图理解助手。请用一句话简洁地描述用户的意图，不超过20个字。只输出意图描述，不要有任何其他内容。'
          },
          { role: 'user', content: userInput }
        ],
        stream: false
      })
    });

    if (response.ok) {
      const data = await response.json();
      const intent = data.choices?.[0]?.message?.content?.trim() || '未知意图';
      writeChunk(res, { type: 'intent', status: 'done', text: intent });
    }
  } catch (e) {
    console.error('[INTENT] 意图理解失败:', e.message);
  }
}

module.exports = { understandIntent };
