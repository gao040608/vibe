export default function InfoCard({ icon, title, theme, loading, loadingText, children }) {
  return (
    <div className="flex justify-start">
      <div className={`${theme.bg} border ${theme.border} rounded-2xl rounded-bl-md px-4 py-2 text-xs ${theme.text} font-mono space-y-1 min-w-[220px]`}>
        <div className={`flex items-center gap-1.5 ${theme.accent}`}>
          <span>{icon}</span>
          <span>{title}</span>
        </div>
        {loading ? (
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${theme.pulse} animate-pulse`} />
            {loadingText}
          </div>
        ) : (
          <div className="mt-1">{children}</div>
        )}
      </div>
    </div>
  )
}
