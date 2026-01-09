import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

export default function FutureSkinSimulation({ originalImage, onClose, patientName }) {
  const [isLoading, setIsLoading] = useState(true)
  const [simulationUrl, setSimulationUrl] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const generate = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/simulate-skin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: originalImage,
            months: 6,
            protocol: 'Signature Rejuvenation'
          })
        })

        if (!res.ok) throw new Error('Simulation failed')

        const { imageUrl } = await res.json()
        setSimulationUrl(imageUrl)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    generate()
  }, [originalImage])

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-900 to-black rounded-3xl border border-amber-800/30 w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-amber-900/30 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{patientName}'s Future Skin</h2>
            <p className="text-sm text-slate-400">AI Simulation • 6 months • Signature Rejuvenation</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={28} />
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 p-8 flex items-center justify-center relative">
          {isLoading ? (
            <div className="text-center">
              <Loader2 className="w-16 h-16 animate-spin text-amber-500 mx-auto mb-4" />
              <p className="text-xl">Generating realistic simulation...</p>
              <p className="text-sm text-slate-500 mt-2">This may take 10–30 seconds</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-400">
              <p className="text-xl mb-4">Error: {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-slate-800 rounded-lg hover:bg-slate-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-center md:text-left">Today</h3>
                <img
                  src={originalImage}
                  alt="Current"
                  className="w-full rounded-xl shadow-2xl border border-slate-700"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 text-center md:text-left">After 6 Months</h3>
                <img
                  src={simulationUrl}
                  alt="Future simulation"
                  className="w-full rounded-xl shadow-2xl border border-amber-700/50"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}