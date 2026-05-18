const fs = require('fs');
const path = require('path');
const { callLLMWithTools } = require('../llm/client');
const { getModel } = require('../config');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const USER_PATH = path.join(MEMORY_DIR, 'USER.md');

const USER_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'user.txt'),
  'utf-8'
);

// Structured Output Schema
const USER_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'user_profile_update',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['update', 'skip'],
          description: 'update 表示更新 USER.md，skip 表示跳过'
        },
        content: {
          type: 'string',
          description: '更新后的完整 USER.md 内容（Markdown 格式），action=skip 时为空字符串'
        },
        reason: {
          type: 'string',
          description: 'action=skip 时的原因说明，action=update 时为空字符串'
        }
      },
      required: ['action', 'content', 'reason'],
      additionalProperties: false
    }
  }
};

function readUserFile() {
  return fs.existsSync(USER_PATH)
    ? fs.readFileSync(USER_PATH, 'utf-8').trim()
    : '';
}

function writeUserFile(content) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  fs.writeFileSync(USER_PATH, content, 'utf-8');
}

/**
 * 用户画像更新 Agent — 使用 Structured Output
 * @param {Array} messages - 完整对话历史
 */
async function userAgent(messages) {
  try {
    const currentUser = readUserFile();
    const conversationText = messages
      .map(m => `[${m.role === 'user' ? '用户' : '助手'}]: ${m.content}`)
      .join('\n');

    const prompt = [
      currentUser ? `当前 USER.md 内容：\n${currentUser}` : '当前 USER.md 内容：（空）',
      `\n---\n\n本次对话记录：\n${conversationText}`
    ].join('\n');

    const message = await callLLMWithTools(
      [
        { role: 'system', content: USER_SYSTEM },
        { role: 'user', content: prompt }
      ],
      {
        model: getModel('qwen-flash'),
        responseFormat: USER_SCHEMA
      }
    );

    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    const result = JSON.parse(content);

    if (result.action === 'skip') {
      console.log(`[USER] 跳过更新：${result.reason}`);
    } else if (result.action === 'update' && result.content) {
      writeUserFile(result.content);
      console.log('[USER] USER.md 已更新');
    }
  } catch (e) {
    console.error('[USER] 更新失败:', e.message);
  }
}

module.exports = { userAgent };
