const fs = require('fs');
const path = require('path');
const { getModel } = require('../config');
const { callLLMWithTools } = require('../llm/client');
const { writeChunk } = require('../utils/stream');
const { generateSkillsIndex } = require('../utils/skills');

const ORCHESTRATOR_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'orchestrator.txt'),
  'utf-8'
);

// Structured Output: 强制 LLM 输出符合此 Schema 的 JSON
const PLAN_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'orchestrator_plan',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        plan: {
          type: 'array',
          items: { type: 'integer' },
          description: 'Agent ID 按执行顺序排列，串行执行。可用 ID: 1(代码助手), 2(代码检查), 3(闲聊), 5(文档生成), 6(技能模板)'
        },
        steps: {
          type: 'array',
          items: { type: 'string' },
          description: '每个 Agent 做什么，6-10字，动词开头。长度必须与 plan 相同'
        }
      },
      required: ['plan', 'steps'],
      additionalProperties: false
    }
  }
};

const FALLBACK_PLAN = { plan: [1], steps: ['规划失败'] };

/**
 * 父 Agent：规划执行计划
 * 使用 Structured Output 保证 JSON 格式
 * @param {string} userInput
 * @param {Object} res - Express response 对象
 * @returns {Promise<Array>} 一维数组执行计划
 */
async function orchestrate(userInput, res) {
  writeChunk(res, { type: 'plan', status: 'thinking' });

  try {
    const skillsIndex = generateSkillsIndex();
    const systemPrompt = skillsIndex
      ? `${ORCHESTRATOR_SYSTEM}\n\n${skillsIndex}`
      : ORCHESTRATOR_SYSTEM;

    const message = await callLLMWithTools(
      [{ role: 'user', content: userInput }],
      {
        model: getModel('qwen3.6-plus'),
        systemMessage: { role: 'system', content: systemPrompt },
        responseFormat: PLAN_SCHEMA
      }
    );

    let result;
    try {
      // Structured Output 返回的 content 是 JSON 字符串
      const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
      result = JSON.parse(content);

      // 校验：plan 是整数数组，steps 是等长字符串数组
      if (
        !result.plan || !Array.isArray(result.plan) ||
        !result.steps || !Array.isArray(result.steps) ||
        result.plan.length !== result.steps.length ||
        !result.plan.every(id => typeof id === 'number') ||
        !result.steps.every(step => typeof step === 'string')
      ) {
        console.warn('[ORCHESTRATOR] 校验失败，LLM 返回:', content);
        result = FALLBACK_PLAN;
      }
    } catch (e) {
      console.warn('[ORCHESTRATOR] JSON 解析失败，LLM 原始返回:', message.content, '错误:', e.message);
      result = FALLBACK_PLAN;
    }

    console.log('[ORCHESTRATOR] 执行计划:', JSON.stringify(result.plan));
    console.log('[ORCHESTRATOR] 步骤描述:', JSON.stringify(result.steps));
    writeChunk(res, { type: 'plan', status: 'done', plan: result.plan, steps: result.steps });
    return result.plan;
  } catch (e) {
    console.error('[ORCHESTRATOR] 规划失败:', e.message);
    writeChunk(res, { type: 'plan', status: 'done', plan: [1], steps: ['规划失败'] });
    return [1];
  }
}

module.exports = { orchestrate };
