const fs = require('fs');
const path = require('path');
const { getSystemPromptWithMemory, getModel } = require('../config');
const { callLLMNonStream, streamText } = require('../llm/client');
const { executeToolCalls, formatToolResults, parseToolCalls } = require('../services/toolRunner');
const { generateToolInstructions } = require('../tools');

const CODEGEN_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'codeGen.txt'),
  'utf-8'
);

function buildSystemMessage() {
  return {
    role: 'system',
    content: `${getSystemPromptWithMemory()}\n\n${CODEGEN_SYSTEM}\n\n# 可用工具\n${generateToolInstructions()}`
  };
}

const MAX_ITERATIONS = 50;

/**
 * 代码生成 Agent（原 chat.js 主流程迁移至此）
 * 执行工具调用循环，直到 LLM 不再调用工具为止
 * @param {Object} context - { messages: Array, res: Object }
 */
async function codeGenAgent(context) {
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

  // 超出最大迭代次数
  context.messages = currentMessages;
}

module.exports = { codeGenAgent };
