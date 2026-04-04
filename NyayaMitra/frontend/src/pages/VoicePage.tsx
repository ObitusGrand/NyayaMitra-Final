// VoicePage — Full voice legal counsellor with mic + text input
import { useState, useRef } from 'react'
import { Loader2, Send, Volume2, ExternalLink, BookOpen, Share2 } from 'lucide-react'
import MicButton from '@/components/MicButton'
import TrustBadge from '@/components/TrustBadge'
import NyayaGauge from '@/components/NyayaGauge'
import { useAppStore, LANG_LABELS, type Language } from '@/store/useAppStore'
import { voiceAsk, textAsk, type VoiceResponse } from '@/services/api'
import { shareAnswerToWhatsApp } from '@/utils/generatePDF'

const SAMPLE_QUESTIONS: Record<string, string> = {
  hi: 'मेरे मालिक ने 3 महीने से तनख्वाह नहीं दी',
  en: 'My employer has not paid salary for 3 months',
  mr: 'माझ्या मालकाने ३ महिने पगार दिला नाही',
  ta: 'என் முதலாளி 3 மாதமாக சம்பளம் கொடுக்கவில்லை',
}

export default function VoicePage() {
  const { language, userState, nyayaScore } = useAppStore()
  const [result, setResult] = useState<VoiceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [textInput, setTextInput] = useState('')
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const lang = language as Language

  const handleResult = (res: VoiceResponse) => {
    setResult(res)
    setLoading(false)
    setError('')
  }

  const handleError = (msg: string) => {
    setError(msg)
    setLoading(false)
  }

  const handleVoice = async (blob: Blob) => {
    setLoading(true)
    setError('')
    try {
      const res = await voiceAsk(blob, lang, userState, nyayaScore)
      handleResult(res)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      handleError(err?.response?.data?.detail || 'Voice query failed. Please try text input.')
    }
  }

  const handleText = async () => {
    if (!textInput.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await textAsk(textInput, lang, userState, nyayaScore)
      handleResult(res)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      handleError(err?.response?.data?.detail || 'Query failed. Check backend connection.')
    }
  }

  const playAudio = () => {
    if (!result?.answer_audio_b64) return
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(`data:audio/wav;base64,${result.answer_audio_b64}`)
    audioRef.current = audio
    audio.onplaying = () => setAudioPlaying(true)
    audio.onended = () => setAudioPlaying(false)
    audio.play()
  }

  return (
    <div id="voice-page" className="page-wrapper">
      {/* Header */}
      <div className="mb-6">
        <h1 className="section-title">Voice Counsellor</h1>
        <p className="section-subtitle">Ask any legal question by voice or text</p>
      </div>

      {/* Language badge */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-slate-500">Language:</span>
        <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
          {LANG_LABELS[lang]}
        </span>
      </div>

      {/* Mic */}
      <div className="glass-card p-8 flex flex-col items-center gap-4 mb-4">
        <MicButton onRecordingComplete={handleVoice} disabled={loading} size="lg" />
        <p className="text-sm text-slate-500 text-center">
          {loading ? 'Processing...' : 'Tap mic to speak · Release to send'}
        </p>
      </div>

      {/* Text input */}
      <div className="flex gap-2 mb-2">
        <input
          id="voice-text-input"
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleText()}
          placeholder={SAMPLE_QUESTIONS[lang] || SAMPLE_QUESTIONS.en}
          className="input-dark flex-1"
          disabled={loading}
        />
        <button
          id="voice-send-btn"
          onClick={handleText}
          disabled={loading || !textInput.trim()}
          className="btn-gold px-4 shrink-0"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card border border-red-400/30 p-3 mb-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 mt-4">
          {[80, 60, 90].map((w, i) => (
            <div key={i} className="h-4 rounded-lg shimmer" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-4 mt-4 fade-in">
          {/* Question */}
          <div className="glass-card p-4">
            <p className="text-xs text-slate-500 mb-1">You asked</p>
            <p className="text-sm text-white font-medium">{result.question_text}</p>
          </div>

          {/* Answer */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <BookOpen size={12} /> Legal Answer
              </p>
              {result.answer_audio_b64 && (
                <button
                  id="play-audio-btn"
                  onClick={playAudio}
                  className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300"
                >
                  <Volume2 size={13} className={audioPlaying ? 'animate-pulse' : ''} />
                  {audioPlaying ? 'Playing...' : 'Play audio'}
                </button>
              )}
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{result.answer}</p>
          </div>

          {/* Win probability + confidence */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4 flex flex-col items-center">
              <NyayaGauge score={result.win_probability} size={120} label="Win Chance" />
            </div>
            <div className="glass-card p-4 flex flex-col items-center">
              <NyayaGauge score={result.confidence} size={120} label="Confidence" />
            </div>
          </div>

          {/* Sections cited */}
          {result.sections_cited?.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-xs text-slate-500 mb-2">Sections cited</p>
              <div className="space-y-1.5">
                {result.sections_cited.slice(0, 3).map((s, i) => (
                  <a
                    key={i}
                    href={s.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-xs hover:bg-white/5 rounded-lg px-2 py-1.5 transition-colors"
                  >
                    <span className="text-slate-400">
                      <span className="text-amber-400 font-semibold">{s.act}</span> § {s.section}
                    </span>
                    <div className="flex items-center gap-1 text-slate-600">
                      <span>{s.relevance}%</span>
                      <ExternalLink size={10} />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Trust badge */}
          <TrustBadge urls={result.law_source_urls} confidence={result.confidence} />

          {/* DLSA recommendation */}
          {result.dlsa_recommended && (
            <div className="glass-card p-4 border border-amber-400/20"
              style={{ background: 'rgba(245,158,11,0.05)' }}>
              <p className="text-xs text-amber-400 font-semibold mb-1">💡 Free Legal Aid Available</p>
              <p className="text-xs text-slate-400">
                DLSA (District Legal Services Authority) provides free legal aid.
                Call NALSA helpline: <strong className="text-white">15100</strong>
              </p>
            </div>
          )}

          {/* WhatsApp share */}
          <button
            id="share-answer-btn"
            onClick={() => shareAnswerToWhatsApp(result.question_text, result.answer, result.acts_cited)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(37,211,102,0.12)', color: '#25d366', border: '1px solid rgba(37,211,102,0.25)' }}
          >
            <Share2 size={16} />
            Share on WhatsApp
          </button>
        </div>
      )}
    </div>
  )
}
