// Splash — Language selection + animated intro
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, ChevronRight } from 'lucide-react'
import { useAppStore, LANG_LABELS, type Language } from '@/store/useAppStore'

const LANGUAGES: Language[] = ['hi', 'en', 'mr', 'ta', 'bn', 'te', 'gu', 'kn']

export default function Splash() {
  const navigate = useNavigate()
  const { language, setLanguage } = useAppStore()
  const [selected, setSelected] = useState<Language>(language)

  const handleContinue = () => {
    setLanguage(selected)
    navigate('/home')
  }

  return (
    <div
      id="splash-page"
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0a0e1a 0%, #0d1628 50%, #111827 100%)' }}
    >
      {/* Background glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 left-1/4 w-[250px] h-[250px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.04) 0%, transparent 70%)' }} />

      {/* Logo */}
      <div className="fade-in flex flex-col items-center mb-10">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: '0 20px 60px rgba(245,158,11,0.35)',
          }}>
          <Scale size={48} className="text-slate-900" />
        </div>
        <h1 className="text-5xl font-black text-white tracking-tight mb-2">
          न्याय<span className="text-gold">मित्र</span>
        </h1>
        <p className="text-base text-slate-400 text-center font-medium">
          AI-Powered Legal Justice
        </p>
        <div className="mt-3 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">Free • Multilingual • Trusted</span>
        </div>
      </div>

      {/* Language selector */}
      <div className="slide-up w-full max-w-sm">
        <p className="text-xs text-slate-500 text-center mb-3 font-medium uppercase tracking-wider">
          Choose your language / अपनी भाषा चुनें
        </p>
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              id={`lang-${lang}`}
              onClick={() => setSelected(lang)}
              className="py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 border"
              style={{
                background: selected === lang ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                borderColor: selected === lang ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.08)',
                color: selected === lang ? '#f59e0b' : '#94a3b8',
                transform: selected === lang ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>

        <button
          id="splash-continue-btn"
          onClick={handleContinue}
          className="btn-gold w-full flex items-center justify-center gap-2 text-base py-4"
        >
          Get Started
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-xs text-slate-600 text-center px-4">
        Free legal aid. Always. Powered by AI + Indian Law.
      </p>
    </div>
  )
}
