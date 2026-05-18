import InfoCard from './InfoCard'

const theme = () => ({
  bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600',
  accent: 'text-purple-400', pulse: 'bg-purple-400', body: 'text-purple-700',
})

export default function IntentPanel({ data }) {
  return (
    <InfoCard
      icon="✦"
      title="意图理解"
      theme={theme()}
      loading={data.loading && !data.text}
      loadingText="正在理解意图..."
    >
      <div className="flex items-center gap-2">
        <span className="text-purple-700 font-medium">{data.text}</span>
        {data.intentType && <span className="text-xs text-purple-400 opacity-60">{data.intentType}</span>}
      </div>
    </InfoCard>
  )
}
