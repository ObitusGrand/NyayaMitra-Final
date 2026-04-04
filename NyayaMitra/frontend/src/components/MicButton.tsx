// MicButton — animated microphone button (Government light theme)
import { useState, useRef, useCallback } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'

interface MicButtonProps { onRecordingComplete: (blob: Blob) => void; disabled?: boolean; size?: 'sm' | 'md' | 'lg' }

export default function MicButton({ onRecordingComplete, disabled, size = 'lg' }: MicButtonProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const sizes = { sm: { btn: 56, icon: 20, ring: 72 }, md: { btn: 72, icon: 26, ring: 90 }, lg: { btn: 88, icon: 32, ring: 112 } }
  const s = sizes[size]

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => { const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); stream.getTracks().forEach(t => t.stop()); setState('processing'); onRecordingComplete(blob); setTimeout(() => setState('idle'), 100) }
      mr.start(); mediaRef.current = mr; setState('recording')
    } catch { alert('Microphone permission denied.') }
  }, [onRecordingComplete])

  const stopRecording = useCallback(() => { mediaRef.current?.stop(); mediaRef.current = null }, [])
  const handleClick = () => { if (disabled) return; if (state === 'idle') startRecording(); else if (state === 'recording') stopRecording() }
  const isRecording = state === 'recording', isProcessing = state === 'processing'

  return (
    <div className="relative flex items-center justify-center" style={{ width: s.ring, height: s.ring }}>
      {isRecording && (
        <>
          <div className="mic-ring" style={{ backgroundColor: 'rgba(211,47,47,0.12)' }} />
          <div className="mic-ring" style={{ backgroundColor: 'rgba(211,47,47,0.06)', animationDelay: '0.5s', transform: 'scale(1.1)' }} />
        </>
      )}
      <button id="mic-button" onClick={handleClick} disabled={disabled || isProcessing} className="relative z-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 outline-none"
        style={{
          width: s.btn, height: s.btn, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          background: isRecording ? 'linear-gradient(135deg, #D32F2F, #B71C1C)' : 'linear-gradient(135deg, var(--saffron), var(--saffron-dark))',
          boxShadow: isRecording ? '0 0 30px rgba(211,47,47,0.3)' : '0 6px 25px rgba(255,153,51,0.3)',
          transform: isRecording ? 'scale(1.05)' : 'scale(1)',
        }}>
        {isProcessing ? <Loader2 size={s.icon} className="animate-spin" color="#FFF" /> : isRecording ? <Square size={s.icon} color="#FFF" fill="#FFF" /> : <Mic size={s.icon} color="#FFF" />}
      </button>
    </div>
  )
}
