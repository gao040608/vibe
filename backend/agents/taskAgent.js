const fs = require('fs');
const path = require('path');
const { getModel } = require('../config');
const { callLLMNonStream } = require('../llm/client');
const { writeChunk } = require('../utils/stream');

const TASK_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'task.txt'),
  'utf-8'
);

/**
 * 任务分解 Agent
 * @param {Object} context - { messages: Array, res: Object }
 */
async function taskAgent(context) {
  const { res, messages } = context;
  if (!res || res.writableEnded) return;

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const userInput = lastUserMessage?.content || '';

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

module.exports = { taskAgent };
