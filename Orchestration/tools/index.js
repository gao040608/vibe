const fs = require('fs');
const path = require('path');
const readFile = require('./read_file');
const createFile = require('./create_file');
const editFile = require('./edit_file');
const deleteFile = require('./delete_file');
const listDir = require('./list_directory');

// 所有工具列表
const tools = [
  readFile,
  createFile,
  editFile,
  deleteFile,
  listDir
];

/**
 * 获取所有工具的定义（用于发送给 LLM）
 * @returns {Array} 工具定义列表
 */
function getToolDefinitions() {
  return tools.map(tool => tool.definition);
}

/**
 * 根据名称查找工具
 * @param {string} name - 工具名称
 * @returns {Object|null} 工具对象
 */
function findToolByName(name) {
  return tools.find(tool => tool.name === name) || null;
}

/**
 * 执行工具
 * @param {string} name - 工具名称
 * @param {Object} args - 工具参数
 * @returns {Object} 执行结果
 */
async function executeTool(name, args) {
  const tool = findToolByName(name);

  if (!tool) {
    return {
      success: false,
      error: `未知工具: ${name}。可用工具: ${tools.map(t => t.name).join(', ')}`
    };
  }

  try {
    return await tool.execute(args);
  } catch (error) {
    return {
      success: false,
      error: `工具执行失败: ${error.message}`
    };
  }
}

/**
 * 从文本内容中解析工具调用
 * 兼容两种格式：
 *   ```tool_call\n{...}\n```   （标准格式，换行分隔）
 *   ```tool_call{...}```       （紧凑格式，LLM 有时输出）
 */
function parseToolCalls(content) {
  const toolCalls = [];
  const marker = '```tool_call';
  let pos = 0;

  while (true) {
    const startMarker = content.indexOf(marker, pos);
    if (startMarker === -1) break;

    const afterMarker = startMarker + marker.length;

    // 找结束的 ```
    const endMarker = content.indexOf('```', afterMarker);
    if (endMarker === -1) break;

    // 提取 marker 和结束符之间的内容，去掉可能的换行
    const jsonStr = content.substring(afterMarker, endMarker).trim();

    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.name && parsed.arguments) {
        toolCalls.push({
          name: parsed.name,
          arguments: parsed.arguments
        });
      }
    } catch (e) {
      // 忽略无法解析的块
    }

    pos = endMarker + 3; // 跳过结束的 ```
  }

  return toolCalls;
}

/**
 * 生成工具使用说明（从 prompts/tools.txt 读取）
 * @returns {string}
 */
function generateToolInstructions() {
  return fs.readFileSync(
    path.join(__dirname, '..', 'prompts', 'tools.txt'),
    'utf-8'
  );
}

module.exports = {
  getToolDefinitions,
  findToolByName,
  executeTool,
  parseToolCalls,
  generateToolInstructions
};
