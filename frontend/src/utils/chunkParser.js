/**
 * SSE chunk 解析器
 * 将后端推送的 JSON chunk 映射为 panels 状态更新
 */

const ACTION_LABEL = {
  read_file: '读取文件',
  create_file: '创建文件',
  edit_file: '编辑文件',
  delete_file: '删除文件',
  list_directory: '列出目录',
}

/**
 * 处理单个 chunk，返回 panels 的更新补丁
 * @param {Object} chunk - 解析后的 JSON chunk
 * @param {Object} currentPanels - 当前 panels 状态
 * @returns {Object|null} panels 补丁，null 表示非 panel 类型 chunk
 */
export function parseChunk(chunk, currentPanels) {
  switch (chunk.type) {
    case 'intent':
      if (chunk.status === 'thinking') {
        return { intent: { loading: true, text: '', intentType: '' } }
      }
      if (chunk.status === 'done') {
        return { intent: { loading: false, text: chunk.text, intentType: chunk.intentType } }
      }
      break

    case 'plan':
      if (chunk.status === 'thinking') {
        return { plan: { loading: true, plan: null, steps: [] } }
      }
      if (chunk.status === 'done') {
        return { plan: { loading: false, plan: chunk.plan, steps: chunk.steps || [] } }
      }
      break

    case 'lint':
      if (chunk.status === 'running') {
        return { lint: { loading: true, errorCount: 0, warningCount: 0, results: [] } }
      }
      if (chunk.status === 'done') {
        return { lint: { loading: false, errorCount: chunk.errorCount, warningCount: chunk.warningCount, results: chunk.results || [] } }
      }
      if (chunk.status === 'error') {
        return { lint: { loading: false, error: chunk.message } }
      }
      break

    case 'tool': {
      const logs = [...(currentPanels.tool?.logs || [])]
      if (chunk.status === 'start') {
        logs.push({ status: 'start', action: chunk.action, path: chunk.path })
      } else if (chunk.status === 'done') {
        const idx = logs.findLastIndex(l => l.status === 'start' && l.action === chunk.action && l.path === chunk.path)
        if (idx !== -1) logs[idx] = { status: 'done', action: chunk.action, path: chunk.path, ok: chunk.ok }
        else logs.push({ status: 'done', action: chunk.action, path: chunk.path, ok: chunk.ok })
      }
      return { tool: { logs } }
    }

    case 'doc':
      if (chunk.status === 'running') {
        return { doc: { loading: true, files: [] } }
      }
      if (chunk.status === 'done') {
        return { doc: { loading: false, files: chunk.files || [] } }
      }
      break

    case 'content':
      // content 类型不更新 panels，由调用方处理 assistantContent
      return null

    default:
      return null
  }
  return null
}

export { ACTION_LABEL }
