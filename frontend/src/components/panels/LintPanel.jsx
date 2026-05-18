import InfoCard from './InfoCard'

function getTheme(data) {
  if (data.loading) return { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', accent: 'text-orange-400', pulse: 'bg-orange-400', body: 'text-orange-700' }
  if (data.error || data.errorCount > 0) return { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600', accent: 'text-red-400', pulse: 'bg-red-400', body: 'text-red-700' }
  return { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', accent: 'text-green-400', pulse: 'bg-green-400', body: 'text-green-700' }
}

export default function LintPanel({ data }) {
  return (
    <InfoCard
      icon="🔍"
      title="代码检查"
      theme={getTheme(data)}
      loading={data.loading}
      loadingText="正在运行 ESLint..."
    >
      {data.error ? (
        <div className="text-red-600">{data.error}</div>
      ) : (
        <div className="space-y-1">
          <div className={data.errorCount > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
            {data.errorCount === 0 && data.warningCount === 0 ? '✓ 未发现问题' : `${data.errorCount} 个错误，${data.warningCount} 个警告`}
          </div>
          {data.results?.map((r, i) => (
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
      )}
    </InfoCard>
  )
}
