import useChat from './hooks/useChat'
import ChatHistory from './components/ChatHistory'
import ChatInput from './components/ChatInput'

export default function App() {
  const { messages, turnPanels, isLoading, sendMessage, stopGeneration } = useChat()

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
        <h1 className="text-lg font-semibold text-gray-800">VibeCoding</h1>
        <p className="text-xs text-gray-500">AI 代码生成助手</p>
      </header>

      <ChatHistory messages={messages} turnPanels={turnPanels} isLoading={isLoading} />

      <ChatInput
        onSend={sendMessage}
        isLoading={isLoading}
        onStop={stopGeneration}
      />
    </div>
  )
}
