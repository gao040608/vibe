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
    const raw = data.choices?.[0]?.message?.content?.trim() || '{"plan":[[3]],"steps":["回复用户"]}';

    let result;
    try {
      result = JSON.parse(raw);
      // 校验格式：必须有 plan 和 steps，plan 是二维数组，steps 是字符串数组且长度匹配
      if (
        !result.plan || !Array.isArray(result.plan) ||
        !result.steps || !Array.isArray(result.steps) ||
        result.plan.length !== result.steps.length ||
        !result.plan.every(phase => Array.isArray(phase) && phase.every(id => typeof id === 'number')) ||
        !result.steps.every(step => typeof step === 'string')
      ) {
        result = { plan: [[3]], steps: ['回复用户'] };
      }
    } catch {
      result = { plan: [[3]], steps: ['回复用户'] };
    }

    console.log('[ORCHESTRATOR] 执行计划:', JSON.stringify(result.plan));
    console.log('[ORCHESTRATOR] 步骤描述:', JSON.stringify(result.steps));
    writeChunk(res, { type: 'plan', status: 'done', plan: result.plan, steps: result.steps });
    return result.plan;
  } catch (e) {
    console.error('[ORCHESTRATOR] 规划失败:', e.message);
    // 降级：默认只执行闲聊对话
    writeChunk(res, { type: 'plan', status: 'done', plan: [[3]], steps: ['回复用户'] });
    return [[3]];
  }
}

module.exports = { orchestrate };
