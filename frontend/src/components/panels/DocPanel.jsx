import InfoCard from './InfoCard'

const theme = () => ({
  bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-600',
  accent: 'text-teal-400', pulse: 'bg-teal-400', body: 'text-teal-700',
})

export default function DocPanel({ data }) {
  return (
    <InfoCard
      icon="📄"
      title="文档生成"
      theme={theme()}
      loading={data.loading}
      loadingText="正在生成文档..."
    >
      <div className="text-teal-700 space-y-0.5">
        {data.files?.map((f, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-teal-400">✓</span>
            <span>{f}</span>
          </div>
        ))}
      </div>
    </InfoCard>
  )
}
