import { useState, useCallback, useRef } from 'react'
import ChatHistory from './components/ChatHistory'
import ChatInput from './components/ChatInput'

const API_URL = 'http://localhost:3000/api/chat'

export default function App() {
  const [messages, setMessages] = useState([])
  const [toolLogs, setToolLogs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [intentInfo, setIntentInfo] = useState(null)
  const abortControllerRef = useRef(null)

  const sendMessage = useCallback(async (userInput) => {
    const newMessages = [...messages, { role: 'user', content: userInput }]
    setMessages(newMessages)
    setToolLogs([])
    setIntentInfo(null)
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
      const logs = []

      setMessages([...newMessages, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        let cut
        while ((cut = buffer.indexOf('\n')) !== -1) {
          const line = buffer.substring(0, cut).trim()
          buffer = buffer.substring(cut + 1)

          if (line.startsWith('[INTENT]')) {
            const text = line.slice('[INTENT]'.length).trim()
            if (text === '正在理解意图') {
              setIntentInfo({ loading: true, text: '' })
            } else if (text.startsWith('意图：')) {
              setIntentInfo({ loading: false, text: text.slice(3) })
            }
          } else if (line.startsWith('[TOOL]') || line.startsWith('[TOOL_RESULT]')) {
            logs.push(line)
            setToolLogs([...logs])
          } else if (line) {
            assistantContent += line + '\n'
            setMessages([...newMessages, { role: 'assistant', content: assistantContent }])
          }
        }
      }

      if (buffer.trim()) {
        const line = buffer.trim()
        if (line.startsWith('[TOOL]') || line.startsWith('[TOOL_RESULT]')) {
          logs.push(line)
          setToolLogs([...logs])
        } else {
          assistantContent += line
          setMessages([...newMessages, { role: 'assistant', content: assistantContent }])
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
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-800">VibeCoding</h1>
        <p className="text-sm text-gray-500">AI 代码生成助手</p>
      </header>

      <ChatHistory messages={messages} toolLogs={toolLogs} isLoading={isLoading} intentInfo={intentInfo} />

      <ChatInput
        onSend={sendMessage}
        isLoading={isLoading}
        onStop={stopGeneration}
      />
    </div>
  )
}
