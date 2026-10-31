import { useSearchParams } from 'react-router-dom'
import CoachChat from '../components/Coach'

export default function CoachPage() {
  const [params] = useSearchParams()
  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-4xl font-bold">Coach</h1>
        <p className="mt-1 text-muted">Ask anything about starting the business. It knows your ideas, your roadmap progress, and can look things up. To ask about one idea, use the coach on that idea's page.</p>
      </header>
      <CoachChat prefill={params.get('q') ?? ''} />
    </div>
  )
}
