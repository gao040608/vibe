const fs = require('fs');
const path = require('path');
const { safeResolve, ensureDirExists } = require('./path_utils');

const createTool = {
  name: 'create_file',

  definition: {
    type: 'function',
    function: {
      name: 'create_file',
      description: `创建新文件并写入内容。\n\n使用说明：\n- 用于创建之前不存在的新文件\n- 会自动创建必要的父目录\n- 如果文件已存在，会返回错误（避免覆盖）\n- 写入后会自动格式化代码（如可能）`,
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: '相对于项目根目录的文件路径，如 "src/components/Button.jsx"。'
          },
          content: {
            type: 'string',
            description: '文件内容。对于代码文件，请确保语法正确、缩进规范。'
          }
        },
        required: ['file_path', 'content']
      }
    }
  },

  async execute(args) {
    const { file_path, content } = args;

    try {
      const target = safeResolve(file_path);

      if (fs.existsSync(target)) {
        return {
          success: false,
          error: `文件已存在: ${file_path}。如果需要修改，请使用 edit_file 工具。`
        };
      }

      ensureDirExists(target);
      fs.writeFileSync(target, content, 'utf-8');

      const stats = fs.statSync(target);

      return {
        success: true,
        file_path,
        size: stats.size,
        message: `文件创建成功: ${file_path}`
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = createTool;
