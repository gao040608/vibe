import { useState, useCallback, useRef } from 'react'
import { parseChunk } from '../utils/chunkParser'

const API_URL = 'http://localhost:3000/api/chat'

export default function useChat() {
  const [messages, setMessages] = useState([])
  const [panels, setPanels] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef(null)

  const sendMessage = useCallback(async (userInput) => {
    const newMessages = [...messages, { role: 'user', content: userInput }]
    setMessages(newMessages)
    setPanels({})
    setIsLoading(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

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

          if (chunk.type === 'content') {
            assistantContent += chunk.text
            setMessages([...newMessages, { role: 'assistant', content: assistantContent }])
            continue
          }

          const patch = parseChunk(chunk, {})
          if (patch) {
            setPanels(prev => ({ ...prev, ...patch }))
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('生成已停止')
      } else {
        console.error('Error:', error)
        setMessages(prev => [
          ...prev.filter(m => !(m.role === 'assistant' && m.content === '')),
          { role: 'assistant', content: '发生错误，请检查后端服务是否启动后重试。' },
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

  return { messages, panels, isLoading, sendMessage, stopGeneration }
}
