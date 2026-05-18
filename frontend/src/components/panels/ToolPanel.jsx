import InfoCard from './InfoCard'
import { ACTION_LABEL } from '../../utils/chunkParser'

const theme = () => ({
  bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-700',
  accent: 'text-yellow-500', pulse: 'bg-yellow-400', body: 'text-yellow-800',
})

export default function ToolPanel({ data }) {
  if (!data.logs || data.logs.length === 0) return null

  return (
    <InfoCard
      icon="🛠️"
      title="工具调用"
      theme={theme()}
      loading={false}
      loadingText=""
    >
      <div className="text-yellow-800 space-y-0.5">
        {data.logs.map((log, i) => {
          const label = ACTION_LABEL[log.action] || log.action
          const display = log.path ? `${label}：${log.path}` : label
          if (log.status === 'start') return (
            <div key={i} className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span>{display}</span>
              <span className="text-yellow-500 ml-1">进行中</span>
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
    </InfoCard>
  )
}
