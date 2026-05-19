const { writeChunk } = require('../utils/stream');

/**
 * 代码检查 Agent（Mock）
 * 直接返回成功，不实际运行 ESLint
 * 将检查结果写入 context.messages 供总结步骤使用
 * @param {Object} context - { messages: Array, res: Object }
 */
async function lintAgent(context) {
  const { res } = context;

  writeChunk(res, { type: 'lint', status: 'running' });

  // 模拟短暂延迟
  await new Promise(r => setTimeout(r, 300));

  const errorCount = 0;
  const warningCount = 0;

  writeChunk(res, { type: 'lint', status: 'done', errorCount, warningCount, results: [] });
  console.log(`[LINT] 检查 完成：${errorCount} 错误，${warningCount} 警告`);

  // 将检查结果写入 context.messages，供总结步骤使用
  context.messages.push({
    role: 'assistant',
    content: `[代码检查完成] ${errorCount} 个错误，${warningCount} 个警告`
  });
}

module.exports = { lintAgent };
