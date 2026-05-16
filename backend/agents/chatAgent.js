const { callLLMStream } = require('../llm/client');
const { getModel } = require('../config');

/**
 * 闲聊 Agent
 * 用于处理用户的问候、闲聊等非编程任务
 * 直接流式输出 LLM 回复，不调用任何工具
 * @param {Object} context - { messages: Array, res: Object }
 */
async function chatAgent(context) {
  const { res } = context;

  // 直接流式输出对话回复，使用快速模型
  await callLLMStream(context.messages, res, { model: getModel('qwen-flash') });
}

module.exports = { chatAgent };
