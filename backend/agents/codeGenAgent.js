const { callLLMNonStream, callLLMStream } = require('../llm/client');
const { executeToolCalls, formatToolResults, parseToolCalls } = require('../services/toolRunner');

const MAX_ITERATIONS = 50;

/**
 * 代码生成 Agent（原 chat.js 主流程迁移至此）
 * 执行工具调用循环，直到 LLM 不再调用工具为止
 * @param {Object} context - { messages: Array, res: Object }
 */
async function codeGenAgent(context) {
  const { res } = context;
  let currentMessages = [...context.messages];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const llmResponse = await callLLMNonStream(currentMessages);
    const toolCalls = parseToolCalls(llmResponse);

    if (toolCalls.length === 0) {
      // 没有工具调用，流式输出最终回复
      await callLLMStream(currentMessages, res);
      // 将最终状态同步回共享 context，供后续 Agent 使用
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
