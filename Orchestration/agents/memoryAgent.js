const fs = require('fs');
const path = require('path');
const { callLLMNonStream } = require('../llm/client');
const { getModel } = require('../config');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const MEMORY_PATH = path.join(MEMORY_DIR, 'MEMORY.md');

const MEMORY_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'memory.txt'),
  'utf-8'
);

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
 * 项目记忆更新 Agent — 按需更新 MEMORY.md
 * @param {Array} messages - 完整对话历史
 */
async function memoryAgent(messages) {
  try {
    const currentMemory = readMemoryFile();
    const conversationText = messages
      .map(m => `[${m.role === 'user' ? '用户' : '助手'}]: ${m.content}`)
      .join('\n');

    const prompt = [
      currentMemory ? `当前 MEMORY.md 内容：\n${currentMemory}` : '当前 MEMORY.md 内容：（空）',
      `\n---\n\n本次对话记录：\n${conversationText}`
    ].join('\n');

    const raw = await callLLMNonStream(
      [
        { role: 'system', content: MEMORY_SYSTEM },
        { role: 'user', content: prompt }
      ],
      { model: getModel('qwen-flash') }
    );

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[MEMORY] 未找到有效 JSON，跳过更新');
      return;
    }

    const result = JSON.parse(jsonMatch[0]);

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
