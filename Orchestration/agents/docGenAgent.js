const fs = require('fs');
const path = require('path');
const { getSystemPromptWithMemory, getModel } = require('../config');
const { callLLMWithTools } = require('../llm/client');
const { executeToolCalls, formatToolResults } = require('../services/toolRunner');
const { getToolDefinitions } = require('../tools');
const { writeChunk } = require('../utils/stream');

const DOCGEN_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'docGen.txt'),
  'utf-8'
);

function buildSystemMessage() {
  return {
    role: 'system',
    content: `${getSystemPromptWithMemory()}\n\n${DOCGEN_SYSTEM}\n\n注意：你只能创建 .md 后缀的文档文件，禁止创建代码文件。`
  };
}

const MAX_ITERATIONS = 50;

// 从工具调用结果中提取写入的文件路径
function extractCreatedFiles(toolResults) {
  return toolResults
    .filter(r => r.name === 'create_file' && r.result && r.result.success)
    .map(r => r.result.file_path)
    .filter(Boolean);
}

// 过滤掉非 .md 文件的 create_file 调用，防止 LLM 越权生成代码
function filterToolCalls(toolCalls) {
  return toolCalls.filter(call => {
    const toolName = call.function.name;
    if (toolName === 'create_file') {
      let args;
      try {
        args = typeof call.function.arguments === 'string'
          ? JSON.parse(call.function.arguments)
          : call.function.arguments;
      } catch { return false; }

      const filePath = args.file_path || '';
      if (!filePath.endsWith('.md')) {
        console.warn(`[DOCGEN] 拦截非文档文件创建：${filePath}`);
        return false;
      }
    }
    return true;
  });
}

/**
 * 文档生成 Agent
 * 使用原生 Function Calling
 * @param {Object} context - { messages: Array, res: Object }
 */
async function docGenAgent(context) {
  const { res } = context;
  let currentMessages = [...context.messages];
  const createdFiles = [];
  const SYSTEM_MESSAGE = buildSystemMessage();
  const tools = getToolDefinitions();

  writeChunk(res, { type: 'doc', status: 'running' });

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const message = await callLLMWithTools(currentMessages, {
      model: getModel('qwen3.6-plus'),
      systemMessage: SYSTEM_MESSAGE,
      tools,
      toolChoice: 'auto'
    });

    // 没有工具调用 → 将最终回复写入 context，不直接输出给用户
    if (!message.tool_calls || message.tool_calls.length === 0) {
      writeChunk(res, { type: 'doc', status: 'done', files: createdFiles });
      currentMessages.push(message);
      context.messages = currentMessages;
      return;
    }

    // 过滤非法工具调用（非 .md 文件创建）
    const filteredCalls = filterToolCalls(message.tool_calls);

    if (filteredCalls.length > 0) {
      const toolResults = await executeToolCalls(filteredCalls, res);
      createdFiles.push(...extractCreatedFiles(toolResults));

      // 将 assistant 消息和工具结果追加到上下文
      currentMessages.push(message);
      for (const result of toolResults) {
        currentMessages.push({
          role: 'tool',
          tool_call_id: result.toolCallId,
          content: formatToolResults([result])
        });
      }
    } else {
      // 所有调用都被过滤了，告诉 LLM 只能创建 .md 文件
      currentMessages.push(message);
      currentMessages.push({
        role: 'tool',
        tool_call_id: message.tool_calls[0].id,
        content: '错误：你只能创建 .md 后缀的文档文件，禁止创建代码文件。'
      });
    }
  }

  writeChunk(res, { type: 'doc', status: 'done', files: createdFiles });
  context.messages = currentMessages;
}

module.exports = { docGenAgent };
