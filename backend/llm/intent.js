const fs = require('fs');
const path = require('path');
const { getModel } = require('../config');
const { callLLMNonStream } = require('./client');
const { writeChunk } = require('../utils/stream');

const INTENT_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'intent.txt'),
  'utf-8'
);

const INTENT_LABELS = {
  CODE_CREATE:     '新建功能',
  CODE_MODIFY:     '修改代码',
  CODE_DELETE:     '删除代码',
  CODE_READ:       '查看代码',
  CODE_REVIEW:     '代码审查',
  FILE_EXPLORE:    '浏览目录',
  FILE_SEARCH:     '查找文件',
  DOC_REQUIREMENT: '生成需求文档',
  DOC_API:         '生成接口文档',
  DOC_DEPLOY:      '生成部署文档',
  DOC_ARCH:        '生成架构文档',
  LINT_CHECK:      '代码检查',
  CHAT_GREET:      '问候',
  CHAT_QUESTION:   '咨询',
  CHAT_FEEDBACK:   '反馈',
};

const VALID_INTENTS = new Set(Object.keys(INTENT_LABELS));

/**
 * 意图理解模块
 * 输出枚举类型 + 中文标签，不参与后续流程
 * @param {string} userInput
 * @param {Object} res - Express response 对象
 */
async function understandIntent(userInput, res) {
  if (!res || res.writableEnded) return;
  writeChunk(res, { type: 'intent', status: 'thinking' });

  try {
    const raw = await callLLMNonStream(
      [{ role: 'system', content: INTENT_SYSTEM }, { role: 'user', content: userInput }],
      { model: getModel('qwen-flash') }
    );

    const intentType = raw.trim().toUpperCase();
    const resolvedType = VALID_INTENTS.has(intentType) ? intentType : 'CHAT_QUESTION';
    const label = INTENT_LABELS[resolvedType];

    console.log(`[INTENT] ${resolvedType} — ${label}`);
    writeChunk(res, { type: 'intent', status: 'done', intentType: resolvedType, text: label });
  } catch (e) {
    console.error('[INTENT] 意图理解失败:', e.message);
  }
}

module.exports = { understandIntent, INTENT_LABELS };
