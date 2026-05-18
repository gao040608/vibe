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
 * 获取所有工具的定义（用于 Function Calling 的 tools 参数）
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

module.exports = {
  getToolDefinitions,
  findToolByName,
  executeTool
};
