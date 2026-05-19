/**
 * 从 messages 数组中提取压缩版对话日志
 * 解决两个问题：
 * 1. assistant 带 tool_calls 时 content 为 null，之前直接输出 "[助手]: null"
 * 2. tool result 可能包含完整文件内容，全量塞入浪费 token
 *
 * @param {Array} messages - OpenAI 格式的 messages 数组
 * @param {Object} [options]
 * @param {number} [options.maxContentLen=200] - 用户消息截断长度
 * @param {number} [options.maxResultLen=100] - 工具结果截断长度
 * @param {number} [options.maxReplyLen=150] - 助手回复截断长度
 * @returns {string} 压缩后的对话文本
 */
function extractConversationLog(messages, { maxContentLen = 200, maxResultLen = 100, maxReplyLen = 150 } = {}) {
  const lines = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      const c = typeof msg.content === 'string' ? msg.content.slice(0, maxContentLen) : '(非文本)';
      lines.push(`[用户]: ${c}`);

    } else if (msg.role === 'assistant') {
      // 提取工具调用信息（content 为 null 的消息才有 tool_calls）
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const call of msg.tool_calls) {
          const name = call.function.name;
          let args;
          try {
            args = typeof call.function.arguments === 'string'
              ? JSON.parse(call.function.arguments) : call.function.arguments;
          } catch { args = {}; }
          const filePath = args.file_path || args.dir_path || '';
          lines.push(`[调用]: ${name}${filePath ? ' ' + filePath : ''}`);
        }
      }
      // 提取自然语言回复
      if (msg.content && typeof msg.content === 'string' && msg.content.trim()) {
        lines.push(`[助手]: ${msg.content.slice(0, maxReplyLen)}`);
      }

    } else if (msg.role === 'tool') {
      const c = typeof msg.content === 'string' ? msg.content.slice(0, maxResultLen) : '(非文本)';
      lines.push(`[结果]: ${c}`);
    }
  }

  return lines.join('\n');
}

module.exports = { extractConversationLog };
