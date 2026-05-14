const { writeChunk } = require('../utils/stream');

/**
 * 代码检查 Agent（Mock）
 * 直接返回成功，不实际运行 ESLint
 * @param {Object} context - { messages: Array, res: Object }
 */
async function lintAgent(context) {
  const { res } = context;

  writeChunk(res, { type: 'lint', status: 'running' });

  // 模拟短暂延迟
  await new Promise(r => setTimeout(r, 300));

  writeChunk(res, { type: 'lint', status: 'done', errorCount: 0, warningCount: 0, results: [] });
  console.log('[LINT] 检查 完成：0 错误，0 警告');
}

module.exports = { lintAgent };
