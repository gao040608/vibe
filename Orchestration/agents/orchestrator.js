const fs = require('fs');
const path = require('path');
const { getModel } = require('../config');
const { callLLMNonStream } = require('../llm/client');
const { writeChunk } = require('../utils/stream');
const { generateSkillsIndex } = require('../utils/skills');

const ORCHESTRATOR_SYSTEM = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'orchestrator.txt'),
  'utf-8'
);

/**
 * 父 Agent：规划执行计划
 * @param {string} userInput
 * @param {Object} res - Express response 对象
 * @returns {Promise<Array>} 一维数组执行计划
 */
async function orchestrate(userInput, res) {
  writeChunk(res, { type: 'plan', status: 'thinking' });

  try {
    // 动态注入技能索引到编排器的系统提示
    const skillsIndex = generateSkillsIndex();
    const systemPrompt = skillsIndex
      ? `${ORCHESTRATOR_SYSTEM}\n\n${skillsIndex}`
      : ORCHESTRATOR_SYSTEM;

    const raw = await callLLMNonStream(
      [{ role: 'user', content: userInput }],
      { model: getModel('qwen3.6-plus'), systemMessage: { role: 'system', content: systemPrompt } }
    );

    const trimmed = raw.trim() || '{"plan":[1],"steps":["规划失败"]}';

    let result;
    try {
      // 从 LLM 返回文本中提取 JSON（兼容代码块包裹、前后加自然语言等情况）
      let jsonStr = trimmed;

      // 1. 尝试去掉 markdown 代码块包裹 ```json ... ```
      const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }

      // 2. 如果不是以 { 开头，从文本中提取第一个 JSON 对象
      if (!jsonStr.startsWith('{')) {
        const extractMatch = trimmed.match(/\{[\s\S]*\}/);
        if (extractMatch) {
          jsonStr = extractMatch[0];
        }
      }

      result = JSON.parse(jsonStr);
      // 校验格式：plan 是一维数字数组，steps 是等长字符串数组
      if (
        !result.plan || !Array.isArray(result.plan) ||
        !result.steps || !Array.isArray(result.steps) ||
        result.plan.length !== result.steps.length ||
        !result.plan.every(id => typeof id === 'number') ||
        !result.steps.every(step => typeof step === 'string')
      ) {
        console.warn('[ORCHESTRATOR] 校验失败，LLM 原始返回:', trimmed);
        result = { plan: [1], steps: ['规划失败'] };
      }
    } catch (e) {
      console.warn('[ORCHESTRATOR] JSON 解析失败，LLM 原始返回:', trimmed, '错误:', e.message);
      result = { plan: [1], steps: ['规划失败'] };
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
