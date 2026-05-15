import { useState, useCallback, useRef } from 'react'
import ChatHistory from './components/ChatHistory'
import ChatInput from './components/ChatInput'

const API_URL = 'http://localhost:3000/api/chat'

export default function App() {
  const [messages, setMessages] = useState([])
  const [panels, setPanels] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef(null)

  const sendMessage = useCallback(async (userInput) => {
    const newMessages = [...messages, { role: 'user', content: userInput }]
    setMessages(newMessages)
    setPanels({})
    setIsLoading(true)

    // 创建 AbortController，用于取消请求
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let buffer = ''

      setMessages([...newMessages, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        let cut
        while ((cut = buffer.indexOf('\n')) !== -1) {
          const line = buffer.substring(0, cut).trim()
          buffer = buffer.substring(cut + 1)
          if (!line) continue

          let chunk
          try { chunk = JSON.parse(line) } catch { continue }

          console.log('[chunk]', chunk)

          if (chunk.type === 'intent') {
            if (chunk.status === 'thinking') setPanels(p => ({ ...p, intent: { loading: true, text: '' } }))
            else if (chunk.status === 'done') setPanels(p => ({ ...p, intent: { loading: false, text: chunk.text } }))
          } else if (chunk.type === 'plan') {
            if (chunk.status === 'thinking') setPanels(p => ({ ...p, plan: { loading: true, plan: null } }))
            else if (chunk.status === 'done') setPanels(p => ({ ...p, plan: { loading: false, plan: chunk.plan } }))
          } else if (chunk.type === 'task') {
            if (chunk.status === 'thinking') setPanels(p => ({ ...p, task: { loading: true, steps: [] } }))
            else if (chunk.status === 'done') setPanels(p => ({ ...p, task: { loading: false, steps: chunk.steps || [] } }))
          } else if (chunk.type === 'lint') {
            if (chunk.status === 'running') setPanels(p => ({ ...p, lint: { loading: true, errorCount: 0, warningCount: 0, results: [] } }))
            else if (chunk.status === 'done') setPanels(p => ({ ...p, lint: { loading: false, errorCount: chunk.errorCount, warningCount: chunk.warningCount, results: chunk.results || [] } }))
            else if (chunk.status === 'error') setPanels(p => ({ ...p, lint: { loading: false, error: chunk.message } }))
          } else if (chunk.type === 'tool') {
            setPanels(p => {
              const logs = [...(p.tool?.logs || [])]
              if (chunk.status === 'start') {
                logs.push({ status: 'start', action: chunk.action, path: chunk.path })
              } else if (chunk.status === 'done') {
                const idx = logs.findLastIndex(l => l.status === 'start' && l.action === chunk.action && l.path === chunk.path)
                if (idx !== -1) logs[idx] = { status: 'done', action: chunk.action, path: chunk.path, ok: chunk.ok }
                else logs.push({ status: 'done', action: chunk.action, path: chunk.path, ok: chunk.ok })
              }
              return { ...p, tool: { logs } }
            })
          } else if (chunk.type === 'doc') {
            if (chunk.status === 'running') setPanels(p => ({ ...p, doc: { loading: true, files: [] } }))
            else if (chunk.status === 'done') setPanels(p => ({ ...p, doc: { loading: false, files: chunk.files || [] } }))
          } else if (chunk.type === 'content') {
            assistantContent += chunk.text
            setMessages([...newMessages, { role: 'assistant', content: assistantContent }])
          }
        }
      }
    } catch (error) {
      // 用户主动取消，不显示错误
      if (error.name === 'AbortError') {
        console.log('生成已停止')
      } else {
        console.error('Error:', error)
        setMessages(prev => [
          ...prev.filter(m => !(m.role === 'assistant' && m.content === '')),
          { role: 'assistant', content: '发生错误，请检查后端服务是否启动后重试。' }
        ])
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [messages])

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
        <h1 className="text-lg font-semibold text-gray-800">VibeCoding</h1>
        <p className="text-xs text-gray-500">AI 代码生成助手</p>
      </header>

      <ChatHistory messages={messages} panels={panels} isLoading={isLoading} />

      <ChatInput
        onSend={sendMessage}
        isLoading={isLoading}
        onStop={stopGeneration}
      />
    </div>
  )
}
