import { useState } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import FutureSkinSimulation from './components/FutureSkinSimulation'

function App() {
  const [image, setImage] = useState(null)
  const [showSimulation, setShowSimulation] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useState(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraActive(true)
      }
    } catch (err) {
      alert("Camera access denied")
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    setImage(canvas.toDataURL('image/jpeg'))
    setIsCameraActive(false)
    videoRef.current.srcObject.getTracks().forEach(t => t.stop())
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="p-6 border-b border-amber-900/30">
        <h1 className="text-3xl font-bold text-amber-400">Aura Gold Clinic</h1>
        <p className="text-slate-400">AI Future Skin Simulation Demo</p>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        {!image ? (
          <div className="text-center py-20">
            <button
              onClick={startCamera}
              className="inline-flex items-center gap-3 bg-amber-600 hover:bg-amber-500 text-black font-bold px-10 py-6 rounded-xl text-lg transition-colors"
            >
              <Camera size={28} /> Start Patient Scan
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="relative rounded-2xl overflow-hidden border border-amber-900/50 bg-black aspect-[4/3] max-w-2xl mx-auto">
              <img src={image} alt="Patient capture" className="w-full h-full object-cover" />

              {isCameraActive && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-w-4xl object-cover scale-x-[-1]"
                  />
                  <button
                    onClick={capturePhoto}
                    className="absolute bottom-16 w-28 h-28 rounded-full border-8 border-white/40 bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20"
                  >
                    <div className="w-20 h-20 rounded-full bg-white" />
                  </button>
                </div>
              )}
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowSimulation(true)}
                className="bg-amber-600 hover:bg-amber-500 text-black font-bold px-12 py-5 rounded-xl text-lg"
              >
                Generate Future Skin Simulation
              </button>
            </div>
          </div>
        )}
      </main>

      {showSimulation && image && (
        <FutureSkinSimulation
          originalImage={image}
          onClose={() => setShowSimulation(false)}
          patientName="Demo Patient"
        />
      )}
    </div>
  )
}

export default App