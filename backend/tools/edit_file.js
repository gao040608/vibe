const fs = require('fs');
const path = require('path');
const { safeResolve } = require('./path_utils');

const editTool = {
  name: 'edit_file',

  definition: {
    type: 'function',
    function: {
      name: 'edit_file',
      description: `编辑现有文件，替换指定文本。\n\n使用说明：\n- 使用 read_file 先读取文件内容（带行号）\n- old_string 必须是文件中的精确匹配（包括空白字符）\n- 如果 old_string 匹配多处，只替换第一处（除非设置 replace_all=true）\n- 修改后文件会自动保存\n\n重要提示：\n- old_string 不要包含行号前缀\n- 如果找不到 old_string，会返回错误并提示相似文本`,
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: '相对于项目根目录的文件路径。'
          },
          old_string: {
            type: 'string',
            description: '要替换的精确文本（不含行号）。'
          },
          new_string: {
            type: 'string',
            description: '替换后的新文本。'
          },
          replace_all: {
            type: 'boolean',
            description: '（可选）是否替换所有匹配处，默认 false（只替换第一处）。'
          }
        },
        required: ['file_path', 'old_string', 'new_string']
      }
    }
  },

  async execute(args) {
    const { file_path, old_string, new_string, replace_all = false } = args;

    try {
      const target = safeResolve(file_path);

      if (!fs.existsSync(target)) {
        return { success: false, error: `文件不存在: ${file_path}` };
      }

      if (!fs.statSync(target).isFile()) {
        return { success: false, error: `不是一个文件: ${file_path}` };
      }

      let content;
      try {
        content = fs.readFileSync(target, 'utf-8');
      } catch (e) {
        return { success: false, error: `无法读取文件: ${e.message}` };
      }

      const index = content.indexOf(old_string);
      if (index === -1) {
        const lines = content.split('\n');
        let suggestion = '';
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(old_string.trim().split('\n')[0])) {
            suggestion = `\n提示：第 ${i + 1} 行附近找到相似内容：\n  ${i + 1}: ${lines[i]}`;
            break;
          }
        }
        return {
          success: false,
          error: `未找到匹配的文本。请检查 old_string 是否精确匹配（包括空白字符）。${suggestion}`
        };
      }

      let newContent;
      if (replace_all) {
        newContent = content.split(old_string).join(new_string);
      } else {
        newContent = content.replace(old_string, new_string);
      }

      fs.writeFileSync(target, newContent, 'utf-8');

      const changes = replace_all
        ? (content.match(new RegExp(escapeRegExp(old_string), 'g')) || []).length
        : 1;

      return {
        success: true,
        file_path,
        changes,
        message: `文件编辑成功: ${file_path}，替换了 ${changes} 处。`
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = editTool;
