const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ALIYUN_API_BASE = process.env.ALIYUN_API_BASE;
const ALIYUN_API_KEY = process.env.ALIYUN_API_KEY;
const PORT = process.env.PORT || 3000;

// 模型映射字典：别名 → 实际模型名
// 优先读取 ALIYUN_MODELS JSON，否则用 ALIYUN_MODEL 构造单条映射
let ALIYUN_MODELS;
try {
  ALIYUN_MODELS = JSON.parse(process.env.ALIYUN_MODELS || '{}');
} catch {
  ALIYUN_MODELS = {};
}
// 默认模型（ALIYUN_MODEL 作为 fallback）
const DEFAULT_MODEL = process.env.ALIYUN_MODEL || Object.values(ALIYUN_MODELS)[0] || 'qwen-flash';

/**
 * 根据别名获取实际模型名，找不到则返回默认模型
 * @param {string} alias - 模型别名，如 'qwen3.6-flash'
 * @returns {string}
 */
function getModel(alias) {
  return ALIYUN_MODELS[alias] || alias || DEFAULT_MODEL;
}

const BASE_SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, 'prompts', 'system_prompt.txt'),
  'utf-8'
);

module.exports = {
  ALIYUN_API_BASE,
  ALIYUN_API_KEY,
  ALIYUN_MODELS,
  DEFAULT_MODEL,
  getModel,
  PORT,
  BASE_SYSTEM_PROMPT
};
