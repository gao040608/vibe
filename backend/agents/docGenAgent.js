const fs = require('fs');
const path = require('path');
const { getSystemPromptWithMemory } = require('../config');
const { callLLMNonStream, streamText } = require('../llm/client');
const { executeToolCalls, formatToolResults, parseToolCalls } = require('../services/toolRunner');
const { generateToolInstructions } = require('../../tools');
const { writeChunk } = require('../utils/stream');

const DOCGEN_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'docGen.txt'),
  'utf-8'
);

function buildSystemMessage() {
  return {
    role: 'system',
    content: `${getSystemPromptWithMemory()}\n\n${DOCGEN_SYSTEM}\n\n# 可用工具\n${generateToolInstructions()}`
  };
}

const MAX_ITERATIONS = 50;

// 从工具调用结果中提取写入的文件路径
function extractCreatedFiles(toolResults) {
  return toolResults
    .filter(r => r.action === 'create_file' && r.ok)
    .map(r => r.path)
    .filter(Boolean);
}

/**
 * 文档生成 Agent
 * @param {Object} context - { messages: Array, res: Object }
 */
async function docGenAgent(context) {
  const { res } = context;
  let currentMessages = [...context.messages];
  const createdFiles = [];
  const SYSTEM_MESSAGE = buildSystemMessage();

  writeChunk(res, { type: 'doc', status: 'running' });

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const llmResponse = await callLLMNonStream(currentMessages, { systemMessage: SYSTEM_MESSAGE });
    const toolCalls = parseToolCalls(llmResponse);

    if (toolCalls.length === 0) {
      writeChunk(res, { type: 'doc', status: 'done', files: createdFiles });
      streamText(llmResponse, res);
      context.messages = currentMessages;
      return;
    }

    const toolResults = await executeToolCalls(toolCalls, res);
    createdFiles.push(...extractCreatedFiles(toolResults));

    const toolResultText = formatToolResults(toolResults);
    currentMessages.push({ role: 'assistant', content: llmResponse });
    currentMessages.push({
      role: 'user',
      content: `工具执行结果：${toolResultText}\n\n请继续处理或给出最终回复。`
    });
  }

  writeChunk(res, { type: 'doc', status: 'done', files: createdFiles });
  context.messages = currentMessages;
}

module.exports = { docGenAgent };
