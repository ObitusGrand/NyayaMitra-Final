// MicButton — animated microphone button with recording state
import { useState, useRef, useCallback } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'

interface MicButtonProps {
  onRecordingComplete: (blob: Blob) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function MicButton({ onRecordingComplete, disabled, size = 'lg' }: MicButtonProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const sizes = {
    sm: { btn: 56, icon: 20, ring: 72 },
    md: { btn: 72, icon: 26, ring: 90 },
    lg: { btn: 88, icon: 32, ring: 112 },
  }
  const s = sizes[size]

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach((t) => t.stop())
        setState('processing')
        onRecordingComplete(blob)
        setTimeout(() => setState('idle'), 100)
      }
      mr.start()
      mediaRef.current = mr
      setState('recording')
    } catch {
      alert('Microphone permission denied. Please allow microphone access.')
    }
  }, [onRecordingComplete])

  const stopRecording = useCallback(() => {
    mediaRef.current?.stop()
    mediaRef.current = null
  }, [])

  const handleClick = () => {
    if (disabled) return
    if (state === 'idle') startRecording()
    else if (state === 'recording') stopRecording()
  }

  const isRecording = state === 'recording'
  const isProcessing = state === 'processing'

  return (
    <div className="relative flex items-center justify-center" style={{ width: s.ring, height: s.ring }}>
      {/* Animated rings when recording */}
      {isRecording && (
        <>
          <div className="mic-ring" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }} />
          <div className="mic-ring" style={{
            backgroundColor: 'rgba(245,158,11,0.08)',
            animationDelay: '0.5s',
            transform: 'scale(1.1)',
          }} />
        </>
      )}

      <button
        id="mic-button"
        onClick={handleClick}
        disabled={disabled || isProcessing}
        className="relative z-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 outline-none"
        style={{
          width: s.btn,
          height: s.btn,
          background: isRecording
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #f59e0b, #d97706)',
          boxShadow: isRecording
            ? '0 0 30px rgba(239,68,68,0.5)'
            : '0 6px 25px rgba(245,158,11,0.4)',
          transform: isRecording ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        {isProcessing ? (
          <Loader2 size={s.icon} className="text-slate-900 animate-spin" />
        ) : isRecording ? (
          <Square size={s.icon} className="text-white" fill="white" />
        ) : (
          <Mic size={s.icon} className="text-slate-900" />
        )}
      </button>
    </div>
  )
}
