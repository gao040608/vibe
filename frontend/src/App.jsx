import { useState, useCallback } from 'react'
import ChatHistory from './components/ChatHistory'
import ChatInput from './components/ChatInput'

const API_URL = 'http://localhost:3000/api/chat'

export default function App() {
  const [messages, setMessages] = useState([])
  const [toolLogs, setToolLogs] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (userInput) => {
    const newMessages = [...messages, { role: 'user', content: userInput }]
    setMessages(newMessages)
    setToolLogs([])   // 新对话，清空工具日志
    setIsLoading(true)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let buffer = ''       // 拼接不完整行
      const logs = []

      setMessages([...newMessages, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // 逐行处理完整行（以 \n 结尾）
        let cut
        while ((cut = buffer.indexOf('\n')) !== -1) {
          const line = buffer.substring(0, cut).trim()
          buffer = buffer.substring(cut + 1)

          if (line.startsWith('[TOOL]') || line.startsWith('[TOOL_RESULT]')) {
            logs.push(line)
            setToolLogs([...logs])
          } else if (line) {
            assistantContent += line + '\n'
            setMessages([...newMessages, { role: 'assistant', content: assistantContent }])
          }
        }
      }

      // 流结束后处理 buffer 剩余内容
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
      console.error('Error:', error)
      setMessages(prev => [
        ...prev.filter(m => !(m.role === 'assistant' && m.content === '')),
        { role: 'assistant', content: '发生错误，请检查后端服务是否启动后重试。' }
      ])
    } finally {
      setIsLoading(false)
    }
  }, [messages])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-800">VibeCoding</h1>
        <p className="text-sm text-gray-500">AI 代码生成助手</p>
      </header>

      <ChatHistory messages={messages} toolLogs={toolLogs} isLoading={isLoading} />

      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  )
}
