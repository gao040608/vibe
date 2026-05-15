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
 * 格式：```tool_call\n{...}\n```
 * 支持多个 tool_call 块
 */
function parseToolCalls(content) {
  const toolCalls = [];

  // 正确写法：不用正则，直接查找 ```tool_call 和 ``` 边界
  const marker = '```tool_call';
  let pos = 0;

  while (true) {
    const startMarker = content.indexOf(marker, pos);
    if (startMarker === -1) break;

    // 找到下一个换行，后面就是 JSON
    const jsonStart = content.indexOf('\n', startMarker) + 1;
    if (jsonStart === 0) break; // 没找到换行

    // 找到结束的 ```
    const endMarker = content.indexOf('\n```', jsonStart);
    if (endMarker === -1) break;

    const jsonStr = content.substring(jsonStart, endMarker).trim();

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

    pos = endMarker + 4; // 跳过 ```
  }

  return toolCalls;
}

/**
 * 生成工具使用说明（添加到系统提示词）
 * @returns {string} 工具使用说明
 */
function generateToolInstructions() {
  const instructions = [
    '# 可用工具',
    '你可以使用以下工具来操作项目文件：\n',
    '1. **read_file** - 读取文件内容',
    '   - 参数：file_path (必需), offset (可选), limit (可选)',
    '   - 示例：{"name": "read_file", "arguments": {"file_path": "src/App.jsx"}}\n',
    '2. **create_file** - 创建新文件',
    '   - 参数：file_path (必需), content (必需)',
    '   - 示例：{"name": "create_file", "arguments": {"file_path": "src/utils/helper.js", "content": "export const add = (a, b) => a + b;"}}',
    '3. **edit_file** - 编辑现有文件',
    '   - 参数：file_path (必需), old_string (必需), new_string (必需), replace_all (可选)',
    '   - 示例：{"name": "edit_file", "arguments": {"file_path": "src/App.jsx", "old_string": "Hello", "new_string": "Hi"}}',
    '4. **delete_file** - 删除文件或空目录',
    '   - 参数：file_path (必需), recursive (可选)',
    '   - 示例：{"name": "delete_file", "arguments": {"file_path": "src/old-file.js"}}',
    '5. **list_directory** - 列出目录内容',
    '   - 参数：dir_path (可选), recursive (可选)',
    '   - 示例：{"name": "list_directory", "arguments": {"dir_path": "src"}}',
    '\n# 工具调用格式',
    '当你需要调用工具时，只输出 tool_call 块，不要在块前后添加任何解释、说明或自然语言：',
    '',
    '```tool_call',
    '{"name": "tool_name", "arguments": {"param1": "value1"}}',
    '```',
    '',
    '可以一次调用多个工具（并列多个 ```tool_call 块）。',
    '',
    '# 重要提示',
    '- **调用工具时禁止输出任何自然语言**，只输出 tool_call 块',
    '- 所有文件路径都是相对于项目根目录的',
    '- 每次操作前先用 list_directory 了解项目结构',
    '- 编辑文件前先用 read_file 读取内容',
    '- 不要猜测文件内容，先读取再编辑',
    '- 路径穿越被禁止，只能操作项目目录下的文件'
  ];

  return instructions.join('\n');
}

module.exports = {
  getToolDefinitions,
  findToolByName,
  executeTool,
  parseToolCalls,
  generateToolInstructions
};
