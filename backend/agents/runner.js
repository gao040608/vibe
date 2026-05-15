const { codeGenAgent } = require('./codeGenAgent');
const { lintAgent } = require('./lintAgent');
const { chatAgent } = require('./chatAgent');
const { taskAgent } = require('./taskAgent');
const { docGenAgent } = require('./docGenAgent');

/**
 * Agent ID → 实现函数映射
 * 1: 代码生成 Agent
 * 2: 代码检查 Agent
 * 3: 闲聊对话 Agent
 * 4: 任务分解 Agent
 * 5: 文档生成 Agent
 */
const AGENT_MAP = {
  1: codeGenAgent,
  2: lintAgent,
  3: chatAgent,
  4: taskAgent,
  5: docGenAgent
};

/**
 * 按执行计划调度 Agent
 * 外层数组串行执行（等待每个阶段完成后再进入下一阶段）
 * 内层数组并行执行（同一阶段内的 Agent 同时运行）
 *
 * 示例：
 *   [[1]]       → 只运行代码生成
 *   [[1],[2]]   → 先代码生成，完成后再 lint
 *   [[1,1],[2]] → 两个代码生成并行，完成后再 lint
 *
 * @param {Array} plan - 二维数组，如 [[1],[2]]
 * @param {Object} context - { messages: Array, res: Object }
 */
async function runPlan(plan, context) {
  for (let phaseIdx = 0; phaseIdx < plan.length; phaseIdx++) {
    const phase = plan[phaseIdx];
    console.log(`[RUNNER] 阶段 ${phaseIdx + 1}/${plan.length}，并行执行 Agent: [${phase.join(', ')}]`);

    const agentFns = phase.map(id => {
      const fn = AGENT_MAP[id];
      if (!fn) {
        console.warn(`[RUNNER] 未知 Agent ID: ${id}，跳过`);
        return () => Promise.resolve();
      }
      return fn;
    });

    // 同一阶段内并行执行
    await Promise.all(agentFns.map(fn => fn(context)));

    console.log(`[RUNNER] 阶段 ${phaseIdx + 1} 完成`);
  }
}

module.exports = { runPlan };
