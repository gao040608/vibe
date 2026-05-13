const fetch = require('node-fetch');
const { ALIYUN_API_BASE, ALIYUN_API_KEY, ALIYUN_MODEL } = require('../config');
const { writeChunk } = require('../utils/stream');

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
            content: '你是一个任务分解助手。将用户的需求拆解为3-5个具体的执行步骤，每步不超过15个字。只输出一个 JSON 数组，格式为 ["步骤1", "步骤2", ...]，不要有任何其他内容。'
          },
          { role: 'user', content: userInput }
        ],
        stream: false
      })
    });

    if (response.ok) {
      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content?.trim() || '[]';
      let steps;
      try {
        steps = JSON.parse(raw);
        if (!Array.isArray(steps)) steps = [raw];
      } catch {
        steps = [raw];
      }
      console.log('[TASK] 任务分解：', steps);
      writeChunk(res, { type: 'task', status: 'done', steps });
    }
  } catch (e) {
    console.error('[TASK] 任务分解失败:', e.message);
  }
}

module.exports = { decomposeTask };
