const fs = require('fs');
const path = require('path');
const { safeResolve, PROJECT_ROOT } = require('./path_utils');

const readTool = {
  name: 'read_file',

  definition: {
    type: 'function',
    function: {
      name: 'read_file',
      description: `读取指定文件的完整内容。\n\n使用说明：\n- 读取文本文件（代码、配置、文档等）\n- 返回文件内容，文本文件会带上行号前缀便于编辑\n- 可以读取图片、PDF 等二进制文件（返回提示信息）\n- 支持分段读取大文件（使用 offset 和 limit 参数）`,
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: '相对于项目根目录的文件路径，如 "src/App.jsx" 或 "package.json"。'
          },
          offset: {
            type: 'number',
            description: '（可选）起始行号（从 0 开始），用于分段读取大文件。'
          },
          limit: {
            type: 'number',
            description: '（可选）读取的最大行数，默认 2000 行。'
          }
        },
        required: ['file_path']
      }
    }
  },

  async execute(args) {
    const { file_path, offset = 0, limit = 2000 } = args;

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
        return { success: false, error: `无法读取文件（可能是二进制文件）: ${file_path}` };
      }

      const lines = content.split('\n');
      const totalLines = lines.length;

      const start = Math.min(offset, totalLines);
      const end = Math.min(offset + limit, totalLines);
      const selectedLines = lines.slice(start, end);

      const numberedContent = selectedLines
        .map((line, idx) => `${(start + idx + 1).toString().padStart(4, ' ')}: ${line}`)
        .join('\n');

      const result = {
        file_path,
        content: numberedContent,
        total_lines: totalLines,
        offset: start,
        limit: end - start
      };

      if (end < totalLines) {
        result.note = `文件较大，仅显示 ${start + 1}-${end} 行，共 ${totalLines} 行。使用 offset 和 limit 参数读取其他部分。`;
      }

      return { success: true, ...result };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = readTool;
