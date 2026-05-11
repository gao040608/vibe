const fs = require('fs');
const path = require('path');
const { safeResolve, PROJECT_ROOT } = require('./path_utils');

const listTool = {
  name: 'list_directory',

  definition: {
    type: 'function',
    function: {
      name: 'list_directory',
      description: `列出指定目录下的文件和子目录。\n\n使用说明：\n- 列出目录内容，类似 ls 或 dir 命令\n- 可以指定是否递归列出所有子目录\n- 返回每个条目的类型（文件/目录）和大小\n- 默认只列出当前目录，不递归`,
      parameters: {
        type: 'object',
        properties: {
          dir_path: {
            type: 'string',
            description: '相对于项目根目录的目录路径，如 "src" 或 "public"。默认为项目根目录。'
          },
          recursive: {
            type: 'boolean',
            description: '（可选）是否递归列出所有子目录内容，默认 false。'
          }
        },
        required: []
      }
    }
  },

  async execute(args) {
    const { dir_path = '', recursive = false } = args;

    try {
      const target = safeResolve(dir_path);

      if (!fs.existsSync(target)) {
        return { success: false, error: `目录不存在: ${dir_path || '(项目根目录)'}` };
      }

      if (!fs.statSync(target).isDirectory()) {
        return { success: false, error: `不是一个目录: ${dir_path}` };
      }

      const result = {
        dir_path: dir_path || '(项目根目录)',
        entries: []
      };

      if (recursive) {
        const walkDir = (currentPath, prefix = '') => {
          const items = fs.readdirSync(currentPath);

          for (const item of items) {
            const fullPath = path.join(currentPath, item);
            const relativePath = path.relative(PROJECT_ROOT, fullPath);
            const stats = fs.statSync(fullPath);

            const entry = {
              name: item,
              path: relativePath,
              type: stats.isDirectory() ? 'directory' : 'file',
              size: stats.isFile() ? stats.size : undefined
            };

            result.entries.push(entry);

            if (stats.isDirectory()) {
              walkDir(fullPath, prefix + '  ');
            }
          }
        };

        walkDir(target);
      } else {
        const items = fs.readdirSync(target);

        for (const item of items) {
          const fullPath = path.join(target, item);
          const relativePath = path.relative(PROJECT_ROOT, fullPath);
          const stats = fs.statSync(fullPath);

          result.entries.push({
            name: item,
            path: relativePath,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.isFile() ? stats.size : undefined
          });
        }
      }

      result.entries.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      result.count = result.entries.length;

      return { success: true, ...result };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = listTool;
