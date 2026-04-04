// VoicePage — Government-grade voice counsellor (light theme)
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
    setResult(res); setLoading(false); setError('')
    // Log activity & earn XP
    useAppStore.getState().setLastResult(res)
    useAppStore.getState().incrementVoiceQueries()
    useAppStore.getState().logActivity({ type: 'voice_query', title: res.question_text?.slice(0, 60) || 'Legal question asked', xpEarned: 50 })
  }
  const handleError = (msg: string) => { setError(msg); setLoading(false) }

  const handleVoice = async (blob: Blob) => {
    setLoading(true); setError('')
    try { const res = await voiceAsk(blob, lang, userState, nyayaScore); handleResult(res) }
    catch (e: unknown) { const err = e as { response?: { data?: { detail?: string } } }; handleError(err?.response?.data?.detail || 'Voice query failed.') }
  }

  const handleText = async () => {
    if (!textInput.trim()) return; setLoading(true); setError('')
    try { const res = await textAsk(textInput, lang, userState, nyayaScore); handleResult(res) }
    catch (e: unknown) { const err = e as { response?: { data?: { detail?: string } } }; handleError(err?.response?.data?.detail || 'Query failed.') }
  }

  const playAudio = () => {
    if (!result?.answer_audio_b64) return
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    const audio = new Audio(`data:audio/wav;base64,${result.answer_audio_b64}`)
    audioRef.current = audio
    audio.onplaying = () => setAudioPlaying(true)
    audio.onended = () => setAudioPlaying(false)
    audio.play()
  }

  return (
    <div id="voice-page" className="page-wrapper">
      <div className="mb-5">
        <h1 className="section-title">Voice Counsellor</h1>
        <p className="section-subtitle">Ask any legal question by voice or text</p>
      </div>

      {/* Language badge */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-caption">Language:</span>
        <span className="badge-safe" style={{ background: 'var(--saffron-light)', color: 'var(--saffron-dark)', border: '1px solid rgba(255,153,51,0.2)' }}>{LANG_LABELS[lang]}</span>
      </div>

      {/* Mic */}
      <div className="gov-card-static p-8 flex flex-col items-center gap-4 mb-4">
        <MicButton onRecordingComplete={handleVoice} disabled={loading} size="lg" />
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          {loading ? 'Processing...' : 'Tap mic to speak · Release to send'}
        </p>
      </div>

      {/* Text input */}
      <div className="flex gap-2.5 mb-2">
        <input id="voice-text-input" type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleText()} placeholder={SAMPLE_QUESTIONS[lang] || SAMPLE_QUESTIONS.en} className="input-gov flex-1" disabled={loading} />
        <button id="voice-send-btn" onClick={handleText} disabled={loading || !textInput.trim()} className="btn-primary px-5 shrink-0">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {error && <div className="alert-danger mb-4"><p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--red-danger)' }}>{error}</p></div>}

      {loading && <div className="space-y-3 mt-4">{[80, 60, 90].map((w, i) => <div key={i} className="h-4 shimmer" style={{ width: `${w}%` }} />)}</div>}

      {result && !loading && (
        <div className="space-y-4 mt-4 fade-in">
          <div className="gov-card-static p-4">
            <p className="text-label mb-1.5">You asked</p>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', fontWeight: 500 }}>{result.question_text}</p>
          </div>

          <div className="gov-card-static p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-caption flex items-center gap-1.5"><BookOpen size={13} /> Legal Answer</p>
              {result.answer_audio_b64 && (
                <button id="play-audio-btn" onClick={playAudio} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--blue-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Volume2 size={14} className={audioPlaying ? 'animate-pulse' : ''} />
                  {audioPlaying ? 'Playing...' : 'Play audio'}
                </button>
              )}
            </div>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>{result.answer}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="gov-card-static p-4 flex flex-col items-center">
              <NyayaGauge score={result.win_probability} size={120} label="Win Chance" />
            </div>
            <div className="gov-card-static p-4 flex flex-col items-center">
              <NyayaGauge score={result.confidence} size={120} label="Confidence" />
            </div>
          </div>

          {result.sections_cited?.length > 0 && (
            <div className="gov-card-static p-4">
              <p className="text-label mb-2.5">Sections cited</p>
              <div className="space-y-2">
                {result.sections_cited.slice(0, 3).map((s, i) => (
                  <a key={i} href={s.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-sm rounded-xl px-3 py-2" style={{ background: 'var(--bg-page)', textDecoration: 'none' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--blue-secondary)' }}>{s.act}</span> § {s.section}
                    </span>
                    <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <span className="text-xs">{s.relevance}%</span>
                      <ExternalLink size={11} />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          <TrustBadge urls={result.law_source_urls} confidence={result.confidence} />

          {result.dlsa_recommended && (
            <div className="alert-success">
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--green-success)' }}>💡 Free Legal Aid Available</p>
                <p className="text-caption" style={{ marginTop: 4 }}>DLSA provides free legal aid. Call NALSA: <strong style={{ color: 'var(--text-primary)' }}>15100</strong></p>
              </div>
            </div>
          )}

          <button id="share-answer-btn" onClick={() => shareAnswerToWhatsApp(result.question_text, result.answer, result.acts_cited)}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
            style={{ background: 'rgba(37,211,102,0.08)', color: '#25d366', border: '1px solid rgba(37,211,102,0.2)' }}>
            <Share2 size={16} /> Share on WhatsApp
          </button>
        </div>
      )}
    </div>
  )
}
