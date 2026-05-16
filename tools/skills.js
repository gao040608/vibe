const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'backend', 'skills');

/**
 * 解析技能文件的 frontmatter，提取 name/description/category/tags
 */
function parseSkillFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = {};
  match[1].split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      frontmatter[key] = value.slice(1, -1).split(',').map(v => v.trim());
    } else {
      frontmatter[key] = value;
    }
  });

  return frontmatter;
}

/**
 * 生成技能索引，注入到编排器和 skillsAgent 的系统提示
 */
function generateSkillsIndex() {
  if (!fs.existsSync(SKILLS_DIR)) return '';

  const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'));
  if (files.length === 0) return '';

  const byCategory = {};
  for (const file of files) {
    const meta = parseSkillFrontmatter(path.join(SKILLS_DIR, file));
    if (!meta?.name || !meta?.description) continue;
    const cat = meta.category || 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push({ name: meta.name, description: meta.description });
  }

  const CATEGORY_LABELS = {
    'web-templates': '网页模板',
    'web-apps': '网页应用',
    'uncategorized': '其他'
  };

  const lines = ['# 可用技能模板', '', '以下是预设的常见场景模板，技能文件存储在 backend/skills/ 目录：', ''];
  for (const [cat, items] of Object.entries(byCategory)) {
    lines.push(`## ${CATEGORY_LABELS[cat] || cat}`);
    items.forEach(s => lines.push(`- **${s.name}**: ${s.description}`));
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = { generateSkillsIndex };
