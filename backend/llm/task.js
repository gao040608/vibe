const fs = require('fs');
const path = require('path');
const { getModel } = require('../config');
const { callLLMNonStream } = require('./client');
const { writeChunk } = require('../utils/stream');

const TASK_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'task.txt'),
  'utf-8'
);

/**
 * 任务分解模块（独立，不与其他模块耦合）
 * 输入：用户原始输入
 * 输出：仅向前端发送 task chunk 并打印控制台，不参与后续流程
 * @param {string} userInput
 * @param {Object} res - Express response 对象
 */
async function decomposeTask(userInput, res) {
  if (!res || res.writableEnded) return;
  writeChunk(res, { type: 'task', status: 'thinking' });

  try {
    const raw = await callLLMNonStream(
      [{ role: 'system', content: TASK_SYSTEM }, { role: 'user', content: userInput }],
      { model: getModel('qwen-flash') }
    );
    let steps;
    try {
      steps = JSON.parse(raw.trim());
      if (!Array.isArray(steps)) steps = [raw.trim()];
    } catch {
      steps = [raw.trim()];
    }
    console.log('[TASK] 任务分解：', steps);
    writeChunk(res, { type: 'task', status: 'done', steps });
  } catch (e) {
    console.error('[TASK] 任务分解失败:', e.message);
  }
}

module.exports = { decomposeTask };
