import { useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage'

const ACTION_LABEL = {
  read_file: '读取文件',
  create_file: '创建文件',
  edit_file: '编辑文件',
  delete_file: '删除文件',
  list_directory: '列出目录',
}

const CARD_CONFIG = [
  {
    key: 'intent',
    title: '意图理解',
    icon: '✦',
    theme: () => ({ bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600', accent: 'text-purple-400', pulse: 'bg-purple-400', body: 'text-purple-700' }),
    loadingText: '正在理解意图...',
    isLoading: d => d.loading && !d.text,
    renderBody: (d, t) => <div className={`${t.body} font-medium`}>意图：{d.text}</div>,
  },
  {
    key: 'plan',
    title: '执行计划',
    icon: '⬡',
    theme: () => ({ bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600', accent: 'text-indigo-400', pulse: 'bg-indigo-400', body: 'text-indigo-700' }),
    loadingText: '正在规划执行计划...',
    isLoading: d => d.loading && !d.plan,
    renderBody: (d, t) => (
      <div className={`${t.body} space-y-0.5`}>
        {d.plan?.map((phase, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={t.accent}>阶段{i + 1}:</span>
            <span>{phase.map(id => `Agent${id}`).join(' + ')}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'task',
    title: '任务分解',
    icon: '☰',
    theme: () => ({ bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', accent: 'text-blue-400', pulse: 'bg-blue-400', body: 'text-blue-700' }),
    loadingText: '正在分解任务...',
    isLoading: d => d.loading && d.steps.length === 0,
    renderBody: (d, t) => (
      <div className={`${t.body} space-y-0.5`}>
        {d.steps.map((step, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className={`${t.accent} mt-0.5`}>{i + 1}.</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'doc',
    title: '文档生成',
    icon: '📄',
    theme: () => ({ bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-600', accent: 'text-teal-400', pulse: 'bg-teal-400', body: 'text-teal-700' }),
    loadingText: '正在生成文档...',
    isLoading: d => d.loading,
    renderBody: (d, t) => (
      <div className={`${t.body} space-y-0.5`}>
        {d.files?.map((f, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={t.accent}>✓</span>
            <span>{f}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'tool',
    title: '工具调用',
    icon: '🛠️',
    theme: () => ({ bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-700', accent: 'text-yellow-500', pulse: 'bg-yellow-400', body: 'text-yellow-800' }),
    loadingText: '',
    isLoading: () => false,
    visible: d => d.logs.length > 0,
    renderBody: (d, t) => (
      <div className={`${t.body} space-y-0.5`}>
        {d.logs.map((log, i) => {
          const label = ACTION_LABEL[log.action] || log.action
          const display = log.path ? `${label}：${log.path}` : label
          if (log.status === 'start') return (
            <div key={i} className="flex items-center gap-1.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${t.pulse} animate-pulse`} />
              <span>{display}</span>
              <span className={`${t.accent} ml-1`}>进行中</span>
            </div>
          )
          return (
            <div key={i} className={`flex items-center gap-1.5 ${log.ok ? 'text-green-700' : 'text-red-700'}`}>
              <span>{log.ok ? '✓' : '✗'}</span>
              <span>{display}</span>
              <span className={`${log.ok ? 'text-green-400' : 'text-red-400'} ml-1`}>{log.ok ? '成功' : '失败'}</span>
            </div>
          )
        })}
      </div>
    ),
  },
  {
    key: 'lint',
    title: '代码检查',
    icon: '🔍',
    theme: d => d.loading
      ? { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', accent: 'text-orange-400', pulse: 'bg-orange-400', body: 'text-orange-700' }
      : (d.error || d.errorCount > 0)
        ? { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600', accent: 'text-red-400', pulse: 'bg-red-400', body: 'text-red-700' }
        : { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', accent: 'text-green-400', pulse: 'bg-green-400', body: 'text-green-700' },
    loadingText: '正在运行 ESLint...',
    isLoading: d => d.loading,
    renderBody: d => d.error ? (
      <div className="text-red-600">{d.error}</div>
    ) : (
      <div className="space-y-1">
        <div className={d.errorCount > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
          {d.errorCount === 0 && d.warningCount === 0 ? '✓ 未发现问题' : `${d.errorCount} 个错误，${d.warningCount} 个警告`}
        </div>
        {d.results?.map((r, i) => (
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
    ),
  },
]

function InfoCard({ config, data }) {
  const theme = config.theme(data)
  return (
    <div className="flex justify-start">
      <div className={`${theme.bg} border ${theme.border} rounded-2xl rounded-bl-md px-4 py-2 text-xs ${theme.text} font-mono space-y-1 min-w-[220px]`}>
        <div className={`flex items-center gap-1.5 ${theme.accent}`}>
          <span>{config.icon}</span>
          <span>{config.title}</span>
        </div>
        {config.isLoading(data) ? (
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${theme.pulse} animate-pulse`} />
            {config.loadingText}
          </div>
        ) : (
          <div className="mt-1">{config.renderBody(data, theme)}</div>
        )}
      </div>
    </div>
  )
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

        {messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg} />
        ))}

        {CARD_CONFIG.map(config => {
          const data = panels[config.key]
          if (!data) return null
          if (config.visible && !config.visible(data)) return null
          return <InfoCard key={config.key} config={config} data={data} />
        })}

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

