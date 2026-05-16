const { codeGenAgent } = require('./codeGenAgent');
const { lintAgent } = require('./lintAgent');
const { chatAgent } = require('./chatAgent');
const { docGenAgent } = require('./docGenAgent');

/**
 * Agent ID → 实现函数映射
 * 1: 代码生成 Agent
 * 2: 代码检查 Agent
 * 3: 闲聊对话 Agent
 * 5: 文档生成 Agent
 */
const AGENT_MAP = {
  1: codeGenAgent,
  2: lintAgent,
  3: chatAgent,
  5: docGenAgent
};

/**
 * 按执行计划串行调度 Agent
 * plan 是一维数组，每个元素是 Agent ID，按顺序依次执行
 *
 * 示例：
 *   [1]     → 只运行代码助手
 *   [1, 2]  → 先代码助手，完成后再 lint
 *
 * @param {Array} plan - 一维数组，如 [1, 2]
 * @param {Object} context - { messages: Array, res: Object }
 */
async function runPlan(plan, context) {
  for (let i = 0; i < plan.length; i++) {
    const id = plan[i];
    const fn = AGENT_MAP[id];
    if (!fn) {
      console.warn(`[RUNNER] 未知 Agent ID: ${id}，跳过`);
      continue;
    }
    console.log(`[RUNNER] 步骤 ${i + 1}/${plan.length}，执行 Agent ${id}`);
    await fn(context);
    console.log(`[RUNNER] 步骤 ${i + 1} 完成`);
  }
}

module.exports = { runPlan };
