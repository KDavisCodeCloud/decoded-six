export default function ContentPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-pricedown text-gta-gold text-3xl leading-none">CONTENT</h1>
        <p className="text-quiet text-sm mt-1">DecodedSix — Internal Dashboard</p>
      </div>

      <div className="dash-card p-12 text-center">
        <div className="text-4xl mb-4">🚧</div>
        <h2 className="font-heading font-bold text-bright mb-2">Coming soon</h2>
        <p className="text-quiet text-sm">
          Full content calendar and article library. For now, review incoming
          drafts in the{' '}
          <a href="/dashboard/queue" className="text-gta-gold hover:underline">
            HITL Queue
          </a>.
        </p>
      </div>
    </div>
  )
}
