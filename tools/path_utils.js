const path = require('path');
const fs = require('fs');

// 项目根目录（用户代码只允许在此目录下操作）
const PROJECT_ROOT = path.resolve('C:/Users/Administrator/Desktop/vibe/project');

// 技能模板目录（只读，供 skillsAgent 读取模板）
const SKILLS_ROOT = path.resolve('C:/Users/Administrator/Desktop/vibe/backend/skills');

/**
 * 安全解析路径，防止路径穿越攻击
 * @param {string} userPath - 用户提供的相对路径
 * @param {string} [root] - 允许的根目录，默认为 PROJECT_ROOT
 * @returns {string} - 安全解析后的绝对路径
 * @throws {Error} - 如果路径尝试穿越根目录
 */
function safeResolve(userPath, root = PROJECT_ROOT) {
  // 移除开头的斜杠，确保是相对路径
  const normalized = userPath.replace(/^[\\/]+/, '');

  // 如果路径以 backend/skills/ 开头，允许访问技能目录
  if (normalized.startsWith('backend/skills/') || normalized.startsWith('backend\\skills\\')) {
    const skillFile = normalized.replace(/^backend[/\\]skills[/\\]/, '');
    const resolved = path.resolve(SKILLS_ROOT, skillFile);
    if (!resolved.startsWith(SKILLS_ROOT)) {
      throw new Error(`路径穿越禁止: 不能访问技能目录外的文件`);
    }
    return resolved;
  }

  // 解析为绝对路径
  const resolved = path.resolve(root, normalized);

  // 检查是否在根目录内
  if (!resolved.startsWith(root)) {
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
  SKILLS_ROOT,
  safeResolve,
  ensureDirExists
};
