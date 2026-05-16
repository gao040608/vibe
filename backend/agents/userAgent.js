const fs = require('fs');
const path = require('path');
const { callLLMNonStream } = require('../llm/client');
const { getModel } = require('../config');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const USER_PATH = path.join(MEMORY_DIR, 'USER.md');

const USER_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'user.txt'),
  'utf-8'
);

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
 * 用户画像更新 Agent — 按需更新 USER.md
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

    const raw = await callLLMNonStream(
      [
        { role: 'system', content: USER_SYSTEM },
        { role: 'user', content: prompt }
      ],
      { model: getModel('qwen-flash') }
    );

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[USER] 未找到有效 JSON，跳过更新');
      return;
    }

    const result = JSON.parse(jsonMatch[0]);

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
