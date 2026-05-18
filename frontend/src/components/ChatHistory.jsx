import { useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage'
import IntentPanel from './panels/IntentPanel'
import PlanPanel from './panels/PlanPanel'
import ToolPanel from './panels/ToolPanel'
import DocPanel from './panels/DocPanel'
import LintPanel from './panels/LintPanel'

const PANEL_COMPONENTS = {
  intent: IntentPanel,
  plan: PlanPanel,
  tool: ToolPanel,
  doc: DocPanel,
  lint: LintPanel,
}

export default function ChatHistory({ messages, panels = {}, isLoading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, panels])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg">👋 你好！我是 VibeCoding</p>
            <p className="text-sm mt-2">描述你想要创建的功能，我会帮你生成代码</p>
          </div>
        )}

        {/* 用户消息 + 非最后一条助手消息 */}
        {messages.map((msg, idx) => {
          if (msg.role === 'assistant' && idx === messages.length - 1) return null
          return <ChatMessage key={idx} message={msg} />
        })}

        {/* 面板：意图/计划/工具/文档/检查 */}
        {Object.entries(PANEL_COMPONENTS).map(([key, Component]) => {
          const data = panels[key]
          if (!data) return null
          return <Component key={key} data={data} />
        })}

        {/* 最后一条助手消息（LLM 回复） */}
        {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
          <ChatMessage key={messages.length - 1} message={messages[messages.length - 1]} />
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
