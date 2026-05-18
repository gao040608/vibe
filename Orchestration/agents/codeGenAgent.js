const fs = require('fs');
const path = require('path');
const { getSystemPromptWithMemory, getModel } = require('../config');
const { callLLMWithTools, streamText } = require('../llm/client');
const { executeToolCalls, formatToolResults } = require('../services/toolRunner');
const { getToolDefinitions } = require('../tools');

const CODEGEN_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'codeGen.txt'),
  'utf-8'
);

function buildSystemMessage() {
  return {
    role: 'system',
    content: `${getSystemPromptWithMemory()}\n\n${CODEGEN_SYSTEM}`
  };
}

const MAX_ITERATIONS = 50;

/**
 * 代码生成 Agent
 * 使用原生 Function Calling，模型通过 tool_calls 返回结构化工具调用
 * @param {Object} context - { messages: Array, res: Object }
 */
async function codeGenAgent(context) {
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

    // 将 assistant 消息（含 tool_calls）和工具结果追加到上下文
    currentMessages.push(message);
    for (const result of toolResults) {
      currentMessages.push({
        role: 'tool',
        tool_call_id: result.toolCallId,
        content: formatToolResults([result])
      });
    }
  }

  // 超出最大迭代次数
  context.messages = currentMessages;
}

module.exports = { codeGenAgent };
