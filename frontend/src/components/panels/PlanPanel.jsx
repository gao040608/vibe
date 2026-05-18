import InfoCard from './InfoCard'

const theme = () => ({
  bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600',
  accent: 'text-indigo-400', pulse: 'bg-indigo-400', body: 'text-indigo-700',
})

export default function PlanPanel({ data }) {
  return (
    <InfoCard
      icon="⬡"
      title="执行计划"
      theme={theme()}
      loading={data.loading && !data.plan}
      loadingText="正在规划执行计划..."
    >
      <div className="text-indigo-700 space-y-0.5">
        {data.steps?.map((step, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-indigo-400">{i + 1}.</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </InfoCard>
  )
}
