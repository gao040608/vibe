const { Router } = require('express');
const { understandIntent } = require('../llm/intent');
const { orchestrate } = require('../agents/orchestrator');
const { runPlan } = require('../agents/runner');
const { memoryAgent } = require('../agents/memoryAgent');
const { userAgent } = require('../agents/userAgent');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * 主聊天接口（多 Agent 编排）
 * 流程：意图理解 + 任务分解 + 编排规划（并行） → 按计划执行 Agent
 */
router.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    if (res.socket) res.socket.setNoDelay(true);

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    const userInput = lastUserMessage?.content || '';

    // 意图理解 → 编排规划 串行执行，依次展示
    await understandIntent(userInput, res);
    const plan = await orchestrate(userInput, res);

    // 共享上下文，在各 Agent 间传递对话历史
    const context = {
      messages: [...messages],
      res
    };

    await runPlan(plan, context);

    // 响应结束后并行更新两个记忆文件，不阻塞本次请求
    res.end();
    Promise.all([
      memoryAgent(context.messages).catch(e => console.error('[MEMORY] 异步更新失败:', e.message)),
      userAgent(context.messages).catch(e => console.error('[USER] 异步更新失败:', e.message))
    ]);
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
