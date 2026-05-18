const { executeTool } = require('../tools');
const { writeChunk } = require('../utils/stream');

const ACTION_MAP = {
  'read_file': '读取文件',
  'create_file': '创建文件',
  'edit_file': '编辑文件',
  'delete_file': '删除文件',
  'list_directory': '列出目录'
};

/**
 * 执行 Function Calling 返回的工具调用
 * @param {Array} toolCalls - OpenAI 格式的 tool_calls 数组
 *   [{ id, type:'function', function: { name, arguments: string } }]
 * @param {Object} res - Express response 对象
 * @returns {Promise<Array>} 执行结果数组，每项含 toolCallId/name/result
 */
async function executeToolCalls(toolCalls, res) {
  const results = [];

  for (const call of toolCalls) {
    const toolName = call.function.name;
    const action = ACTION_MAP[toolName] || '操作';
    let toolArgs;

    try {
      toolArgs = typeof call.function.arguments === 'string'
        ? JSON.parse(call.function.arguments)
        : call.function.arguments;
    } catch (e) {
      console.warn(`[TOOL] 参数解析失败: ${call.function.arguments}`);
      toolArgs = {};
    }

    const filePath = toolArgs.file_path || toolArgs.dir_path || '';
    const toolMsg = `${action}：${filePath}`;

    writeChunk(res, { type: 'tool', status: 'start', action, path: filePath });
    console.log(`[TOOL] ${toolMsg}`);

    const result = await executeTool(toolName, toolArgs);
    results.push({
      toolCallId: call.id,
      name: toolName,
      arguments: toolArgs,
      result
    });

    writeChunk(res, { type: 'tool', status: 'done', action, path: filePath, ok: result.success });
  }

  return results;
}

/**
 * 格式化工具执行结果为文本，用于追加到上下文
 * @param {Array} results
 * @returns {string}
 */
function formatToolResults(results) {
  const lines = [];

  for (const { name, arguments: args, result } of results) {
    lines.push(`## ${name}`);
    lines.push(`参数: ${JSON.stringify(args, null, 2)}`);
    lines.push(`结果: ${JSON.stringify(result, null, 2)}`);
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = { executeToolCalls, formatToolResults };
