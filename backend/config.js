const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { generateToolInstructions } = require('../tools');

const ALIYUN_API_BASE = process.env.ALIYUN_API_BASE;
const ALIYUN_API_KEY = process.env.ALIYUN_API_KEY;
const ALIYUN_MODEL = process.env.ALIYUN_MODEL;
const PORT = process.env.PORT || 3000;

const BASE_SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, 'prompts', 'system_prompt.txt'),
  'utf-8'
);

const SYSTEM_MESSAGE = {
  role: 'system',
  content: `${BASE_SYSTEM_PROMPT}\n\n# 可用工具\n${generateToolInstructions()}`
};

module.exports = {
  ALIYUN_API_BASE,
  ALIYUN_API_KEY,
  ALIYUN_MODEL,
  PORT,
  SYSTEM_MESSAGE
};
