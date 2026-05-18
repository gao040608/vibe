const fs = require('fs');
const path = require('path');
const { getSystemPromptWithMemory, getModel } = require('../config');
const { callLLMNonStream, streamText } = require('../llm/client');
const { executeToolCalls, formatToolResults, parseToolCalls } = require('../services/toolRunner');
const { generateToolInstructions } = require('../tools');
const { generateSkillsIndex } = require('../utils/skills');

const SKILLS_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'skills.txt'),
  'utf-8'
);

function buildSystemMessage() {
  const skillsIndex = generateSkillsIndex();
  return {
    role: 'system',
    content: [
      getSystemPromptWithMemory(),
      SKILLS_SYSTEM,
      skillsIndex,
      `# 可用工具\n${generateToolInstructions()}`
    ].join('\n\n')
  };
}

const MAX_ITERATIONS = 20;

/**
 * 技能模板 Agent
 * 根据用户需求匹配技能模板，按模板创建文件
 * @param {Object} context - { messages: Array, res: Object }
 */
async function skillsAgent(context) {
  const { res } = context;
  let currentMessages = [...context.messages];
  const SYSTEM_MESSAGE = buildSystemMessage();

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const llmResponse = await callLLMNonStream(currentMessages, { model: getModel('qwen3.6-plus'), systemMessage: SYSTEM_MESSAGE });
    const toolCalls = parseToolCalls(llmResponse);

    if (toolCalls.length === 0) {
      streamText(llmResponse, res);
      context.messages = currentMessages;
      return;
    }

    const toolResults = await executeToolCalls(toolCalls, res);
    const toolResultText = formatToolResults(toolResults);

    currentMessages.push({ role: 'assistant', content: llmResponse });
    currentMessages.push({
      role: 'user',
      content: `工具执行结果：${toolResultText}\n\n请继续处理或给出最终回复。`
    });
  }

  context.messages = currentMessages;
}

module.exports = { skillsAgent };
