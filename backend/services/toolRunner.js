const { executeTool, parseToolCalls } = require('../../tools');
const { writeChunk } = require('../utils/stream');

const ACTION_MAP = {
  'read_file': '读取文件',
  'create_file': '创建文件',
  'edit_file': '编辑文件',
  'delete_file': '删除文件',
  'list_directory': '列出目录'
};

/**
 * 执行工具调用，并向前端发送 SSE chunk 显示操作进度
 * @param {Array} toolCalls
 * @param {Object} res - Express response 对象
 * @returns {Promise<Array>}
 */
async function executeToolCalls(toolCalls, res) {
  const results = [];

  for (const call of toolCalls) {
    const action = ACTION_MAP[call.name] || '操作';
    const filePath = call.arguments.file_path || '';
    const toolMsg = `${action}：${filePath}`;

    writeChunk(res, { type: 'tool', status: 'start', action, path: filePath });
    console.log(`[TOOL] ${toolMsg}`);

    const result = await executeTool(call.name, call.arguments);
    results.push({ name: call.name, arguments: call.arguments, result });

    writeChunk(res, { type: 'tool', status: 'done', action, path: filePath, ok: result.success });
  }

  return results;
}

/**
 * 格式化工具执行结果为文本，追加到对话上下文
 * @param {Array} results
 * @returns {string}
 */
function formatToolResults(results) {
  const lines = ['\n\n# 工具执行结果\n'];

  for (const { name, arguments: args, result } of results) {
    lines.push(`## ${name}`);
    lines.push(`参数: ${JSON.stringify(args, null, 2)}`);
    lines.push(`结果: ${JSON.stringify(result, null, 2)}`);
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = { executeToolCalls, formatToolResults, parseToolCalls };
