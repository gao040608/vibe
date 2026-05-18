const fs = require('fs');
const path = require('path');
const { getSystemPromptWithMemory, getModel } = require('../config');
const { callLLMWithTools, streamText } = require('../llm/client');
const { executeToolCalls, formatToolResults } = require('../services/toolRunner');
const { getToolDefinitions } = require('../tools');
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
      skillsIndex
    ].join('\n\n')
  };
}

const MAX_ITERATIONS = 20;

/**
 * 技能模板 Agent
 * 使用原生 Function Calling
 * @param {Object} context - { messages: Array, res: Object }
 */
async function skillsAgent(context) {
  const { res } = context;
  let currentMessages = [...context.messages];
  const SYSTEM_MESSAGE = buildSystemMessage();
  const tools = getToolDefinitions();

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const message = await callLLMWithTools(currentMessages, {
      model: getModel('qwen3.6-plus'),
      systemMessage: SYSTEM_MESSAGE,
      tools,
      toolChoice: 'auto'
    });

    // 没有工具调用 → 最终回复
    if (!message.tool_calls || message.tool_calls.length === 0) {
      const finalContent = message.content || '';
      streamText(finalContent, res);
      context.messages = currentMessages;
      return;
    }

    // 有工具调用 → 执行并继续
    const toolResults = await executeToolCalls(message.tool_calls, res);

    currentMessages.push(message);
    for (const result of toolResults) {
      currentMessages.push({
        role: 'tool',
        tool_call_id: result.toolCallId,
        content: formatToolResults([result])
      });
    }
  }

  context.messages = currentMessages;
}

module.exports = { skillsAgent };
