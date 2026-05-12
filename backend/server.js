const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { generateToolInstructions, executeTool, parseToolCalls } = require('../tools');

const app = express();
app.use(cors());
app.use(express.json());

const ALIYUN_API_BASE = process.env.ALIYUN_API_BASE;
const ALIYUN_API_KEY = process.env.ALIYUN_API_KEY;
const ALIYUN_MODEL = process.env.ALIYUN_MODEL;
const PORT = process.env.PORT || 3000;

// 加载提示词文件
const SYSTEM_PROMPT_PATH = path.join(__dirname, '..', 'prompts', 'system_prompt.txt');
const ENDING_PROMPT_PATH = path.join(__dirname, '..', 'prompts', 'ending_prompt.txt');

const BASE_SYSTEM_PROMPT = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8');
const ENDING_PROMPT = fs.readFileSync(ENDING_PROMPT_PATH, 'utf-8');

const SYSTEM_MESSAGE = {
  role: 'system',
  content: `${BASE_SYSTEM_PROMPT}\n\n# 可用工具\n${generateToolInstructions()}`
};

/**
 * 调用阿里云 API（非流式，用于工具调用场景）
 */
async function callLLMNonStream(messages) {
  const apiMessages = [SYSTEM_MESSAGE, ...messages];

  const response = await fetch(ALIYUN_API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ALIYUN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: ALIYUN_MODEL,
      messages: apiMessages,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 调用阿里云 API（流式，用于最终响应）
 * @param {Array} messages - 对话历史
 * @param {Object} res - Express response 对象
 * @param {string} [extraSystemPrompt] - 额外的系统提示词（如结束语提示）
 */
async function callLLMStream(messages, res, extraSystemPrompt) {
  // 如果传入了额外的系统提示词，追加到 SYSTEM_MESSAGE 后面
  let systemMessage = SYSTEM_MESSAGE;
  if (extraSystemPrompt) {
    systemMessage = {
      role: 'system',
      content: `${SYSTEM_MESSAGE.content}\n\n${extraSystemPrompt}`
    };
  }
  const apiMessages = [systemMessage, ...messages];

  const apiResponse = await fetch(ALIYUN_API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ALIYUN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: ALIYUN_MODEL,
      messages: apiMessages,
      stream: true
    })
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    throw new Error(`LLM API error: ${apiResponse.status} ${errorText}`);
  }

  return new Promise((resolve, reject) => {
    let buffer = '';
    let fullContent = '';

    apiResponse.body.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            res.write(content);
          }
        } catch (e) {
          // skip malformed SSE lines
        }
      }
    });

    apiResponse.body.on('end', () => {
      resolve(fullContent);
    });

    apiResponse.body.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * 执行工具调用，并向前端发送 SSE chunk 显示操作
 * @param {Array} toolCalls - 工具调用列表
 * @param {Object} res - Express response 对象（用于 SSE）
 * @returns {Array} 执行结果
 */
async function executeToolCalls(toolCalls, res) {
  const results = [];
  const actionMap = {
    'read_file': '读取文件',
    'create_file': '创建文件',
    'edit_file': '编辑文件',
    'delete_file': '删除文件',
    'list_directory': '列出目录'
  };

  for (const call of toolCalls) {
    const action = actionMap[call.name] || '操作';
    const filePath = call.arguments.file_path || '';
    const toolMsg = `${action}：${filePath}`;

    // 向前端发送工具执行信息（SSE chunk）
    if (res && !res.writableEnded) {
      res.write(`\n[TOOL] ${toolMsg}\n`);
    }
    console.log(`[TOOL] ${toolMsg}`);

    const result = await executeTool(call.name, call.arguments);
    results.push({
      name: call.name,
      arguments: call.arguments,
      result: result
    });

    // 执行完成后发送结果状态
    if (res && !res.writableEnded) {
      const status = result.success ? '✓' : '✗';
      res.write(`[TOOL_RESULT] ${status} ${toolMsg}\n`);
    }
  }

  return results;
}

/**
 * 格式化工具结果为文本
 */
function formatToolResults(results) {
  const lines = ['\n\n# 工具执行结果\n'];

  for (const { name, arguments, result } of results) {
    lines.push(`## ${name}`);
    lines.push(`参数: ${JSON.stringify(arguments, null, 2)}`);
    lines.push(`结果: ${JSON.stringify(result, null, 2)}`);
    lines.push('');
  }

  return lines.join('\n');
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * 主聊天接口（支持工具调用）
 */
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    let currentMessages = [...messages];
    let maxIterations = 50; // 防止无限循环

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for (let i = 0; i < maxIterations; i++) {
      // 调用 LLM（非流式，便于解析工具调用）
      const llmResponse = await callLLMNonStream(currentMessages);

      // 解析工具调用
      const toolCalls = parseToolCalls(llmResponse);

      if (toolCalls.length === 0) {
        // 没有工具调用，这是最终响应
        // 把 ENDING_PROMPT 作为 extraSystemPrompt 传入，让 LLM 回复精炼
        await callLLMStream(currentMessages, res, ENDING_PROMPT);
        res.end();
        return;
      }

      // 执行工具，并向前端发送 SSE chunk 显示操作
      const toolResults = await executeToolCalls(toolCalls, res);
      const toolResultText = formatToolResults(toolResults);

      // 将工具调用和结果添加到对话
      currentMessages.push({
        role: 'assistant',
        content: llmResponse
      });

      currentMessages.push({
        role: 'user',
        content: `工具执行结果：${toolResultText}\n\n请继续处理或给出最终回复。`
      });
    }

    // 达到最大迭代次数
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

app.listen(PORT, () => {
  console.log(`VibeCoding backend running on http://localhost:${PORT}`);
});
