const { callLLMStream } = require('../llm/client');

/**
 * 闲聊 Agent
 * 用于处理用户的问候、闲聊等非编程任务
 * 直接流式输出 LLM 回复，不调用任何工具
 * @param {Object} context - { messages: Array, res: Object }
 */
async function chatAgent(context) {
  const { res } = context;
  
  // 直接流式输出对话回复
  await callLLMStream(context.messages, res);
}

module.exports = { chatAgent };
