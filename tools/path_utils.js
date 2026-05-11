const path = require('path');
const fs = require('fs');

// 项目根目录（只允许在此目录下操作）
const PROJECT_ROOT = path.resolve('C:/Users/Administrator/Desktop/vibe/project');

/**
 * 安全解析路径，防止路径穿越攻击
 * @param {string} userPath - 用户提供的相对路径
 * @returns {string} - 安全解析后的绝对路径
 * @throws {Error} - 如果路径尝试穿越项目根目录
 */
function safeResolve(userPath) {
  // 移除开头的斜杠，确保是相对路径
  const normalized = userPath.replace(/^[\\/]+/, '');
  
  // 解析为绝对路径
  const resolved = path.resolve(PROJECT_ROOT, normalized);
  
  // 检查是否在项目根目录内
  if (!resolved.startsWith(PROJECT_ROOT)) {
    throw new Error(`路径穿越禁止: 不能访问项目目录外的文件`);
  }
  
  return resolved;
}

/**
 * 确保目录存在
 * @param {string} filePath - 文件路径
 */
function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = {
  PROJECT_ROOT,
  safeResolve,
  ensureDirExists
};
