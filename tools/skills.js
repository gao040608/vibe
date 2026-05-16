const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'backend', 'skills');

/**
 * 解析技能文件的 frontmatter
 */
function parseSkillFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // 提取 YAML frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return null;
  }

  const [, frontmatterRaw, body] = match;
  const frontmatter = {};

  // 简单解析 YAML（只支持基础键值对和数组）
  frontmatterRaw.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    // 解析数组 [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      frontmatter[key] = value.slice(1, -1).split(',').map(v => v.trim());
    } else {
      frontmatter[key] = value;
    }
  });

  return {
    ...frontmatter,
    body: body.trim(),
    filePath
  };
}

/**
 * 列出所有技能
 */
function listSkills() {
  if (!fs.existsSync(SKILLS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'));
  const skills = [];

  for (const file of files) {
    const filePath = path.join(SKILLS_DIR, file);
    const skill = parseSkillFile(filePath);
    if (skill) {
      skills.push({
        name: skill.name,
        description: skill.description,
        category: skill.category || 'uncategorized',
        tags: skill.tags || []
      });
    }
  }

  return skills;
}

/**
 * 查看技能详情
 */
function viewSkill(name) {
  if (!fs.existsSync(SKILLS_DIR)) {
    return { success: false, error: '技能目录不存在' };
  }

  const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(SKILLS_DIR, file);
    const skill = parseSkillFile(filePath);

    if (skill && skill.name === name) {
      return {
        success: true,
        name: skill.name,
        description: skill.description,
        category: skill.category || 'uncategorized',
        tags: skill.tags || [],
        content: skill.body
      };
    }
  }

  return { success: false, error: `技能 "${name}" 不存在` };
}

/**
 * 创建新技能
 */
function createSkill({ name, description, category, tags, content }) {
  if (!name || !description || !content) {
    return { success: false, error: '缺少必需参数：name, description, content' };
  }

  // 验证名称格式
  if (!/^[a-z0-9-]+$/.test(name)) {
    return { success: false, error: '技能名称只能包含小写字母、数字和连字符' };
  }

  fs.mkdirSync(SKILLS_DIR, { recursive: true });

  const fileName = `${name}.md`;
  const filePath = path.join(SKILLS_DIR, fileName);

  if (fs.existsSync(filePath)) {
    return { success: false, error: `技能 "${name}" 已存在` };
  }

  // 构建 frontmatter
  const frontmatter = [
    '---',
    `name: ${name}`,
    `description: ${description}`,
    category ? `category: ${category}` : null,
    tags && tags.length > 0 ? `tags: [${tags.join(', ')}]` : null,
    '---',
    ''
  ].filter(Boolean).join('\n');

  const fullContent = frontmatter + content;

  fs.writeFileSync(filePath, fullContent, 'utf-8');

  return {
    success: true,
    message: `技能 "${name}" 创建成功`,
    path: filePath
  };
}

/**
 * 删除技能
 */
function deleteSkill(name) {
  if (!fs.existsSync(SKILLS_DIR)) {
    return { success: false, error: '技能目录不存在' };
  }

  const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(SKILLS_DIR, file);
    const skill = parseSkillFile(filePath);

    if (skill && skill.name === name) {
      fs.unlinkSync(filePath);
      return {
        success: true,
        message: `技能 "${name}" 已删除`
      };
    }
  }

  return { success: false, error: `技能 "${name}" 不存在` };
}

/**
 * 生成技能索引（用于系统提示）
 */
function generateSkillsIndex() {
  const skills = listSkills();

  if (skills.length === 0) {
    return '';
  }

  // 按分类分组
  const byCategory = {};
  skills.forEach(skill => {
    const cat = skill.category || 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(skill);
  });

  const lines = ['# 可用技能模板', '', '以下是预设的常见场景模板，技能文件存储在 backend/skills/ 目录：', ''];

  for (const [category, items] of Object.entries(byCategory)) {
    const categoryName = {
      'web-templates': '网页模板',
      'web-apps': '网页应用',
      'uncategorized': '其他'
    }[category] || category;

    lines.push(`## ${categoryName}`);
    items.forEach(skill => {
      lines.push(`- **${skill.name}**: ${skill.description}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  listSkills,
  viewSkill,
  createSkill,
  deleteSkill,
  generateSkillsIndex
};
