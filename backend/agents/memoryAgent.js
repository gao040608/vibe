const fs = require('fs');
const path = require('path');
const { callLLMNonStream } = require('../llm/client');
const { getModel } = require('../config');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const MEMORY_PATH = path.join(MEMORY_DIR, 'MEMORY.md');
const USER_PATH = path.join(MEMORY_DIR, 'USER.md');

const MEMORY_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'memory.txt'),
  'utf-8'
);

function readMemoryFiles() {
  const memory = fs.existsSync(MEMORY_PATH)
    ? fs.readFileSync(MEMORY_PATH, 'utf-8').trim()
    : '';
  const user = fs.existsSync(USER_PATH)
    ? fs.readFileSync(USER_PATH, 'utf-8').trim()
    : '';
  return { memory, user };
}

function writeMemoryFiles({ memory, user }) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  if (typeof memory === 'string') fs.writeFileSync(MEMORY_PATH, memory, 'utf-8');
  if (typeof user === 'string') fs.writeFileSync(USER_PATH, user, 'utf-8');
}

/**
 * 记忆更新 Agent — 在每次对话结束后异步运行，不阻塞响应
 * 读取完整对话历史，提取有价值信息写入 MEMORY.md 和 USER.md
 * @param {Array} messages - 完整对话历史（含本轮 assistant 回复）
 */
async function memoryAgent(messages) {
  try {
    const { memory, user } = readMemoryFiles();

    const currentMemoryBlock = [
      memory ? `当前 MEMORY.md 内容：\n${memory}` : '当前 MEMORY.md 内容：（空）',
      user ? `当前 USER.md 内容：\n${user}` : '当前 USER.md 内容：（空）',
    ].join('\n\n');

    const conversationText = messages
      .map(m => `[${m.role === 'user' ? '用户' : '助手'}]: ${m.content}`)
      .join('\n');

    const prompt = `${currentMemoryBlock}\n\n---\n\n本次对话记录：\n${conversationText}`;

    const raw = await callLLMNonStream(
      [
        { role: 'system', content: MEMORY_SYSTEM },
        { role: 'user', content: prompt }
      ],
      { model: getModel('qwen-flash') }
    );

    // 提取 JSON，兼容 LLM 在前后输出多余文字的情况
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[MEMORY] 未找到有效 JSON，跳过更新');
      return;
    }

    const result = JSON.parse(jsonMatch[0]);
    writeMemoryFiles(result);
    console.log('[MEMORY] 记忆文件已更新');
  } catch (e) {
    console.error('[MEMORY] 更新失败:', e.message);
  }
}

module.exports = { memoryAgent, readMemoryFiles };
