import { useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage'

const ACTION_LABEL = {
  read_file: '读取文件',
  create_file: '创建文件',
  edit_file: '编辑文件',
  delete_file: '删除文件',
  list_directory: '列出目录',
}

/**
 * 渲染单条工具日志（结构化对象）
 * { status: 'start', action, path }  → 灰色进行中
 * { status: 'done', action, path, ok } → 绿色成功 / 红色失败
 */
function ToolLog({ log }) {
  const label = ACTION_LABEL[log.action] || log.action
  const display = log.path ? `${label}：${log.path}` : label

  if (log.status === 'start') {
    return (
      <div className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-500">
        ⚙️ {display}
      </div>
    )
  }

  return (
    <div className={`text-xs font-mono px-2 py-0.5 rounded ${
      log.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
    }`}>
      {log.ok ? '✓' : '✗'} {display}
    </div>
  )
}

export default function ChatHistory({ messages, toolLogs, isLoading, intentInfo, taskInfo, planInfo, lintInfo }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolLogs, intentInfo, taskInfo, planInfo, lintInfo])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg">👋 你好！我是 VibeCoding</p>
            <p className="text-sm mt-2">描述你想要创建的功能，我会帮你生成代码</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg} />
        ))}


        {/* 意图理解状态 */}
        {intentInfo && (
          <div className="flex justify-start">
            <div className="bg-purple-50 border border-purple-100 rounded-2xl rounded-bl-md px-4 py-2 text-xs text-purple-600 font-mono space-y-0.5">
              {intentInfo.loading && !intentInfo.text ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  正在理解意图...
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <span>✦</span>
                    <span>意图理解</span>
                  </div>
                  <div className="text-purple-700 font-medium">意图：{intentInfo.text}</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 任务分解状态 */}
        {taskInfo && (
          <div className="flex justify-start">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl rounded-bl-md px-4 py-2 text-xs text-blue-600 font-mono space-y-1">
              {taskInfo.loading && taskInfo.steps.length === 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  正在分解任务...
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-blue-400">
                    <span>☰</span>
                    <span>任务分解</span>
                  </div>
                  <div className="text-blue-700 space-y-0.5 mt-1">
                    {taskInfo.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-blue-400 mt-0.5">{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 执行计划（Orchestrator 输出） */}
        {planInfo && (
          <div className="flex justify-start">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-bl-md px-4 py-2 text-xs text-indigo-600 font-mono space-y-1">
              {planInfo.loading && !planInfo.plan ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  正在规划执行计划...
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-indigo-400">
                    <span>⬡</span>
                    <span>执行计划</span>
                  </div>
                  <div className="text-indigo-700 space-y-0.5 mt-1">
                    {planInfo.plan?.map((phase, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-indigo-400">阶段{i + 1}:</span>
                        <span>{phase.map(id => id === 1 ? '代码生成' : id === 2 ? '代码检查' : `Agent${id}`).join(' + ')}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 工具执行日志（卡片风格） */}
        {toolLogs.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-yellow-50 border border-yellow-100 rounded-2xl rounded-bl-md px-4 py-2 text-xs text-yellow-700 font-mono space-y-1 min-w-[220px]">
              <div className="flex items-center gap-1.5 text-yellow-500">
                <span>🛠️</span>
                <span>工具调用</span>
              </div>
              <div className="text-yellow-800 space-y-0.5 mt-1">
                {toolLogs.map((log, i) => {
                  const label = ACTION_LABEL[log.action] || log.action;
                  const display = log.path ? `${label}：${log.path}` : label;
                  if (log.status === 'start') {
                    return (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                        <span>{display}</span>
                        <span className="text-yellow-400 ml-1">进行中</span>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className={`flex items-center gap-1.5 ${log.ok ? 'text-green-700' : 'text-red-700'}`}>
                      <span>{log.ok ? '✓' : '✗'}</span>
                      <span>{display}</span>
                      <span className={log.ok ? 'text-green-400 ml-1' : 'text-red-400 ml-1'}>{log.ok ? '成功' : '失败'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}


        {/* Lint 检查结果 */}
        {lintInfo && (
          <div className="flex justify-start">
            <div className={`border rounded-2xl rounded-bl-md px-4 py-2 text-xs font-mono space-y-1 min-w-[220px] ${
              lintInfo.loading
                ? 'bg-orange-50 border-orange-100 text-orange-600'
                : lintInfo.error
                  ? 'bg-red-50 border-red-100 text-red-600'
                  : lintInfo.errorCount > 0
                    ? 'bg-red-50 border-red-100 text-red-700'
                    : 'bg-green-50 border-green-100 text-green-700'
            }`}>
              <div className="flex items-center gap-1.5 opacity-70">
                <span>🔍</span>
                <span>代码检查</span>
              </div>
              {lintInfo.loading ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  正在运行 ESLint...
                </div>
              ) : lintInfo.error ? (
                <div className="mt-1 text-red-600">{lintInfo.error}</div>
              ) : (
                <div className="mt-1 space-y-1">
                  <div className={lintInfo.errorCount > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                    {lintInfo.errorCount === 0 && lintInfo.warningCount === 0
                      ? '✓ 未发现问题'
                      : `${lintInfo.errorCount} 个错误，${lintInfo.warningCount} 个警告`}
                  </div>
                  {lintInfo.results?.map((r, i) => (
                    <div key={i} className="space-y-0.5">
                      <div className="text-gray-500 font-medium">{r.file}</div>
                      {r.errors.map((e, j) => (
                        <div key={j} className={`pl-2 ${e.severity === 'error' ? 'text-red-600' : 'text-yellow-600'}`}>
                          {e.severity === 'error' ? '✗' : '⚠'} 第{e.line}行: {e.message}
                          {e.rule && <span className="opacity-50 ml-1">({e.rule})</span>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-500">
              正在生成...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
