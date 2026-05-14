const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { ALIYUN_API_BASE, ALIYUN_API_KEY, getModel } = require('../config');
const { writeChunk } = require('../utils/stream');

const ORCHESTRATOR_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'orchestrator.txt'),
  'utf-8'
);

/**
 * 父 Agent：规划执行计划
 * @param {string} userInput
 * @param {Object} res - Express response 对象
 * @returns {Promise<Array>} 二维数组执行计划
 */
async function orchestrate(userInput, res) {
  writeChunk(res, { type: 'plan', status: 'thinking' });

  try {
    const response = await fetch(ALIYUN_API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ALIYUN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: getModel('qwen3.6-plus'),
        messages: [
          { role: 'system', content: ORCHESTRATOR_SYSTEM },
          { role: 'user', content: userInput }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Orchestrator API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '[[1]]';

    let plan;
    try {
      plan = JSON.parse(raw);
      // 校验格式：必须是二维数组，每个元素是数字数组
      if (
        !Array.isArray(plan) ||
        plan.length === 0 ||
        !plan.every(phase => Array.isArray(phase) && phase.every(id => typeof id === 'number'))
      ) {
        plan = [[3]];
      }
    } catch {
      plan = [[3]];
    }

    console.log('[ORCHESTRATOR] 执行计划:', JSON.stringify(plan));
    writeChunk(res, { type: 'plan', status: 'done', plan });
    return plan;
  } catch (e) {
    console.error('[ORCHESTRATOR] 规划失败:', e.message);
    // 降级：默认只执行闲聊对话
    writeChunk(res, { type: 'plan', status: 'done', plan: [[3]] });
    return [[3]];
  }
}

module.exports = { orchestrate };
