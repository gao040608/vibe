const fs = require('fs');
const path = require('path');
const { getModel } = require('../config');
const { callLLMNonStream } = require('./client');
const { writeChunk } = require('../utils/stream');

const INTENT_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'intent.txt'),
  'utf-8'
);

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
    const intent = await callLLMNonStream(
      [{ role: 'system', content: INTENT_SYSTEM }, { role: 'user', content: userInput }],
      { model: getModel('qwen-flash') }
    );
    writeChunk(res, { type: 'intent', status: 'done', text: intent.trim() || '未知意图' });
  } catch (e) {
    console.error('[INTENT] 意图理解失败:', e.message);
  }
}

module.exports = { understandIntent };
