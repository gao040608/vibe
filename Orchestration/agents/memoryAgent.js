const fs = require('fs');
const path = require('path');
const { callLLMWithTools } = require('../llm/client');
const { getModel } = require('../config');
const { extractConversationLog } = require('../utils/conversationLog');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const MEMORY_PATH = path.join(MEMORY_DIR, 'MEMORY.md');

const MEMORY_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'memory.txt'),
  'utf-8'
);

// Structured Output Schema
const MEMORY_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'memory_update',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['update', 'skip'],
          description: 'update 表示更新 MEMORY.md，skip 表示跳过'
        },
        content: {
          type: 'string',
          description: '更新后的完整 MEMORY.md 内容（Markdown 格式），action=skip 时为空字符串'
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

function readMemoryFile() {
  return fs.existsSync(MEMORY_PATH)
    ? fs.readFileSync(MEMORY_PATH, 'utf-8').trim()
    : '';
}

function writeMemoryFile(content) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  fs.writeFileSync(MEMORY_PATH, content, 'utf-8');
}

/**
 * 项目记忆更新 Agent — 使用 Structured Output
 * @param {Array} messages - 完整对话历史
 */
async function memoryAgent(messages) {
  try {
    const currentMemory = readMemoryFile();
    const conversationText = extractConversationLog(messages);

    const prompt = [
      currentMemory ? `当前 MEMORY.md 内容：\n${currentMemory}` : '当前 MEMORY.md 内容：（空）',
      `\n---\n\n本次对话记录：\n${conversationText}`
    ].join('\n');

    const message = await callLLMWithTools(
      [
        { role: 'system', content: MEMORY_SYSTEM },
        { role: 'user', content: prompt }
      ],
      {
        model: getModel('qwen-flash'),
        responseFormat: MEMORY_SCHEMA
      }
    );

    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    const result = JSON.parse(content);

    if (result.action === 'skip') {
      console.log(`[MEMORY] 跳过更新：${result.reason}`);
    } else if (result.action === 'update' && result.content) {
      writeMemoryFile(result.content);
      console.log('[MEMORY] MEMORY.md 已更新');
    }
  } catch (e) {
    console.error('[MEMORY] 更新失败:', e.message);
  }
}

module.exports = { memoryAgent };
