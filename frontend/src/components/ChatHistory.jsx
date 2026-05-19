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
  doc: DocPanel,
  tool: ToolPanel,
  lint: LintPanel,
}

/**
 * 渲染一组 panels（意图/计划/工具/文档/检查）
 */
function PanelGroup({ panels = {} }) {
  return Object.entries(PANEL_COMPONENTS).map(([key, Component]) => {
    const data = panels[key]
    if (!data) return null
    return <Component key={key} data={data} />
  })
}

export default function ChatHistory({ messages, turnPanels = {}, isLoading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, turnPanels])

  // 将扁平 messages 按轮次分组：每组 = [user, assistant?, ...] 直到下一个 user
  const turns = []
  let currentTurn = null
  let turnIndex = 0

  messages.forEach((msg, idx) => {
    if (msg.role === 'user') {
      if (currentTurn) turns.push(currentTurn)
      currentTurn = { turnIndex, userMsg: msg, userIdx: idx, assistantMsg: null, assistantIdx: null }
      turnIndex++
    } else if (msg.role === 'assistant' && currentTurn) {
      currentTurn.assistantMsg = msg
      currentTurn.assistantIdx = idx
    }
  })
  if (currentTurn) turns.push(currentTurn)

  const isLastTurn = (t) => t.turnIndex === turns.length - 1

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg">👋 你好！我是 VibeCoding</p>
            <p className="text-sm mt-2">描述你想要创建的功能，我会帮你生成代码</p>
          </div>
        )}

        {turns.map((turn) => {
          const panels = turnPanels[turn.turnIndex] || {}
          const last = isLastTurn(turn)

          return (
            <div key={turn.turnIndex} className="space-y-4">
              {/* 用户消息 */}
              <ChatMessage key={turn.userIdx} message={turn.userMsg} />

              {/* 本轮 panels：意图/计划/工具/文档/检查 */}
              <PanelGroup panels={panels} />

              {/* 助手消息 */}
              {turn.assistantMsg && (
                <ChatMessage
                  key={turn.assistantIdx}
                  message={turn.assistantMsg}
                />
              )}

              {/* 仅最后一轮、且正在等待助手回复时显示加载 */}
              {last && isLoading && !turn.assistantMsg && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-500">
                    正在生成...
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
