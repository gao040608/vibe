const { Router } = require('express');
const { ENDING_PROMPT } = require('../config');
const { callLLMNonStream, callLLMStream } = require('../llm/client');
const { understandIntent } = require('../llm/intent');
const { executeToolCalls, formatToolResults, parseToolCalls } = require('../services/toolRunner');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * 主聊天接口（支持工具调用循环）
 */
router.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    let currentMessages = [...messages];
    const maxIterations = 50;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 立即发送响应头，让浏览器知道流式响应已开始
    res.flushHeaders();
    // 禁用 Nagle 算法，确保每次 res.write() 立即发出
    if (res.socket) res.socket.setNoDelay(true);

    // 意图理解（独立模块，仅输出到前端，不参与后续流程）
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    await understandIntent(lastUserMessage?.content || '', res);

    for (let i = 0; i < maxIterations; i++) {
      const llmResponse = await callLLMNonStream(currentMessages);
      const toolCalls = parseToolCalls(llmResponse);

      if (toolCalls.length === 0) {
        await callLLMStream(currentMessages, res, ENDING_PROMPT);
        res.end();
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

    res.write('\n\n（达到最大工具调用次数，强制结束）');
    res.end();

  } catch (error) {
    console.error('Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.end();
    }
  }
});

module.exports = router;
