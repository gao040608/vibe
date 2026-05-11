const fs = require('fs');
const path = require('path');
const { safeResolve } = require('./path_utils');

const deleteTool = {
  name: 'delete_file',

  definition: {
    type: 'function',
    function: {
      name: 'delete_file',
      description: `删除指定文件或空目录。\n\n使用说明：\n- 删除单个文件或空目录\n- 删除前会再次确认文件路径\n- 不能删除非空目录（请先删除目录内文件）\n- 危险操作，请谨慎使用`,
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: '相对于项目根目录的文件或目录路径。'
          },
          recursive: {
            type: 'boolean',
            description: '（可选）是否递归删除非空目录，默认 false。危险操作！'
          }
        },
        required: ['file_path']
      }
    }
  },

  async execute(args) {
    const { file_path, recursive = false } = args;

    try {
      const target = safeResolve(file_path);

      if (!fs.existsSync(target)) {
        return { success: false, error: `文件或目录不存在: ${file_path}` };
      }

      const stats = fs.statSync(target);

      if (stats.isDirectory()) {
        const contents = fs.readdirSync(target);

        if (contents.length > 0 && !recursive) {
          return {
            success: false,
            error: `目录非空: ${file_path}。使用 recursive=true 递归删除，或先删除目录内文件。`
          };
        }

        if (recursive) {
          fs.rmdirSync(target, { recursive: true });
        } else {
          fs.rmdirSync(target);
        }

        return {
          success: true,
          file_path,
          type: 'directory',
          message: `目录删除成功: ${file_path}`
        };

      } else {
        fs.unlinkSync(target);

        return {
          success: true,
          file_path,
          type: 'file',
          message: `文件删除成功: ${file_path}`
        };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = deleteTool;
