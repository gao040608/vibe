import { useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage'

/**
 * 渲染单条工具日志
 * [TOOL] 读取文件：src/App.jsx   → 灰色进行中
 * [TOOL_RESULT] ✓ 读取文件：...  → 绿色成功 / 红色失败
 */
function ToolLog({ text }) {
  const isResult = text.startsWith('[TOOL_RESULT]')
  const isOk = isResult && text.includes('✓')
  const label = text
    .replace('[TOOL]', '⚙️')
    .replace('[TOOL_RESULT]', '')
    .trim()

  return (
    <div className={`text-xs font-mono px-2 py-0.5 rounded ${
      isResult
        ? isOk
          ? 'bg-green-50 text-green-700'
          : 'bg-red-50 text-red-700'
        : 'bg-gray-100 text-gray-500'
    }`}>
      {label}
    </div>
  )
}

export default function ChatHistory({ messages, toolLogs, isLoading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolLogs])

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

        {/* 工具执行日志 */}
        {toolLogs.length > 0 && (
          <div className="flex flex-col gap-1 ml-2">
            {toolLogs.map((log, i) => (
              <ToolLog key={i} text={log} />
            ))}
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
