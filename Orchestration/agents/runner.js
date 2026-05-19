const fs = require('fs');
const path = require('path');
const { codeGenAgent } = require('./codeGenAgent');
const { lintAgent } = require('./lintAgent');
const { chatAgent } = require('./chatAgent');
const { docGenAgent } = require('./docGenAgent');
const { skillsAgent } = require('./skillsAgent');
const { callLLMStream } = require('../llm/client');
const { getModel, getSystemPromptWithMemory } = require('../config');
const { extractConversationLog } = require('../utils/conversationLog');

const SUMMARY_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'summary.txt'),
  'utf-8'
);

function buildSummarySystemMessage() {
  return {
    role: 'system',
    content: `${getSystemPromptWithMemory()}\n\n${SUMMARY_SYSTEM}`
  };
}

const AGENT_MAP = {
  1: codeGenAgent,
  2: lintAgent,
  3: chatAgent,
  5: docGenAgent,
  6: skillsAgent
};

async function generateSummary(context) {
  const conversationLog = extractConversationLog(context.messages);
  const prompt = '以下是本次对话的执行记录：\n\n' + conversationLog;

  await callLLMStream(
    [{ role: 'user', content: prompt }],
    context.res,
    {
      model: getModel('qwen-flash'),
      systemMessage: buildSummarySystemMessage()
    }
  );
}

async function runPlan(plan, context) {
  for (let i = 0; i < plan.length; i++) {
    const id = plan[i];
    const fn = AGENT_MAP[id];
    if (!fn) {
      console.warn('[RUNNER] 未知 Agent ID: ' + id + '，跳过');
      continue;
    }
    console.log('[RUNNER] 步骤 ' + (i + 1) + '/' + plan.length + '，执行 Agent ' + id);
    await fn(context);
    console.log('[RUNNER] 步骤 ' + (i + 1) + ' 完成');
  }

  if (plan.length === 1 && plan[0] === 3) {
    return;
  }

  console.log('[RUNNER] 生成总结');
  await generateSummary(context);
  console.log('[RUNNER] 总结完成');
}

module.exports = { runPlan };
