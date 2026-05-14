const fetch = require('node-fetch');
const { ALIYUN_API_BASE, ALIYUN_API_KEY, ALIYUN_MODEL } = require('../config');
const { writeChunk } = require('../utils/stream');

const ORCHESTRATOR_SYSTEM = `你是一个 Agent 编排助手。你有以下可用的 Agent：
- Agent 1（代码生成）：根据用户需求生成、修改、创建代码文件
- Agent 2（代码检查）：对 project 目录运行 ESLint 静态检查，发现代码错误和警告

根据用户的请求，返回一个执行计划，格式为 JSON 二维数组：
- 外层数组的每个元素代表一个执行阶段，各阶段按顺序串行执行
- 内层数组的每个元素代表该阶段内并行执行的 Agent ID（数字）
- [[1]] 表示只执行代码生成
- [[2]] 表示只执行代码检查
- [[1],[2]] 表示先执行代码生成，完成后再执行代码检查（用户要求生成并检查时使用）
- [[1,1],[2]] 表示两个代码生成 Agent 并行执行，完成后再检查

判断规则：
- 用户只要求生成/修改/创建代码 → [[1]]
- 用户要求生成代码并检查，或要求修复后检查 → [[1],[2]]
- 用户只要求检查/lint/eslint → [[2]]

只输出 JSON 数组，不要有任何其他内容。`;

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
        model: ALIYUN_MODEL,
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
        plan = [[1]];
      }
    } catch {
      plan = [[1]];
    }

    console.log('[ORCHESTRATOR] 执行计划:', JSON.stringify(plan));
    writeChunk(res, { type: 'plan', status: 'done', plan });
    return plan;
  } catch (e) {
    console.error('[ORCHESTRATOR] 规划失败:', e.message);
    // 降级：默认只执行代码生成
    writeChunk(res, { type: 'plan', status: 'done', plan: [[1]] });
    return [[1]];
  }
}

module.exports = { orchestrate };
