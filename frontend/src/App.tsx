import { useState } from 'react'

interface CheckResult {
  verdict: 'True' | 'False' | 'Misleading' | 'Unverifiable'
  explanation: string
  confidence: number
}

const verdictConfig = {
  True: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', label: '✓ True' },
  False: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', label: '✗ False' },
  Misleading: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', label: '⚠ Misleading' },
  Unverifiable: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: '? Unverifiable' },
}

function App() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Error ${res.status}`)
      }
      const data: CheckResult = await res.json()
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const cfg = result ? verdictConfig[result.verdict] ?? verdictConfig.Unverifiable : null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Fact Checker</h1>
          <p className="text-gray-500">Enter a claim or statement to verify its accuracy</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <textarea
            className="w-full border border-gray-200 rounded-xl p-4 text-gray-800 text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            rows={5}
            placeholder="e.g. The Great Wall of China is visible from space."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
          />

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition text-base cursor-pointer"
            onClick={handleCheck}
            disabled={loading || !text.trim()}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Checking…
              </span>
            ) : (
              'Check Facts'
            )}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
              {error}
            </div>
          )}

          {result && cfg && (
            <div className="space-y-4 pt-2">
              <div className={`inline-flex items-center px-4 py-2 rounded-full border font-semibold text-sm ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                {cfg.label}
              </div>

              <p className="text-gray-700 text-base leading-relaxed">{result.explanation}</p>

              <div>
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Confidence</span>
                  <span className="font-medium text-gray-700">{result.confidence}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App

