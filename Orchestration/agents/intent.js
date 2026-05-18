const fs = require('fs');
const path = require('path');
const { getModel } = require('../config');
const { callLLMWithTools } = require('../llm/client');
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

// Structured Output: 强制输出合法的 intent 枚举值
const INTENT_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'intent_classification',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        intent: {
          type: 'string',
          enum: Object.keys(INTENT_LABELS),
          description: '用户意图分类'
        }
      },
      required: ['intent'],
      additionalProperties: false
    }
  }
};

/**
 * 意图理解模块
 * 使用 Structured Output 保证输出合法枚举值
 * @param {string} userInput
 * @param {Object} res - Express response 对象
 */
async function understandIntent(userInput, res) {
  if (!res || res.writableEnded) return;
  writeChunk(res, { type: 'intent', status: 'thinking' });

  try {
    const message = await callLLMWithTools(
      [{ role: 'system', content: INTENT_SYSTEM }, { role: 'user', content: userInput }],
      {
        model: getModel('qwen-flash'),
        responseFormat: INTENT_SCHEMA
      }
    );

    let intentType;
    try {
      const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
      const parsed = JSON.parse(content);
      intentType = parsed.intent;
    } catch (e) {
      console.warn('[INTENT] 解析失败:', e.message);
      intentType = 'CHAT_QUESTION';
    }

    const resolvedType = VALID_INTENTS.has(intentType) ? intentType : 'CHAT_QUESTION';
    const label = INTENT_LABELS[resolvedType];

    console.log(`[INTENT] ${resolvedType} — ${label}`);
    writeChunk(res, { type: 'intent', status: 'done', intentType: resolvedType, text: label });
  } catch (e) {
    console.error('[INTENT] 意图理解失败:', e.message);
  }
}

module.exports = { understandIntent, INTENT_LABELS };
