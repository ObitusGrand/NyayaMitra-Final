// LawyerFinder — Agentic AI Lawyer Matching Page
import { useState, useRef } from 'react'
import {
  Search, MapPin, Phone, Mail, Star, Award, Scale,
  Clock, CheckCircle, AlertTriangle, Loader2, ChevronDown,
  Shield, Zap, BookOpen, Copy, Check,
  Briefcase, Building2, Users, Filter, Sparkles
} from 'lucide-react'
import { findLawyers, type FindLawyersResponse, type LawyerProfile, type CaseAnalysis } from '@/services/api'
import { useAppStore } from '@/store/useAppStore'
import MicButton from '@/components/MicButton'
import { voiceAsk } from '@/services/api'

// ── Constants ────────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  'All India', 'Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu',
  'Telangana', 'Gujarat', 'Rajasthan', 'West Bengal', 'Kerala',
  'Uttar Pradesh', 'Madhya Pradesh', 'Punjab', 'Haryana', 'Bihar',
]

const CASE_TYPE_ICONS: Record<string, typeof Scale> = {
  criminal: Shield, labour: Briefcase, property: Building2,
  consumer: Users, family: Users, cyber: Zap,
}

const CASE_TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  criminal: { color: '#D32F2F', bg: '#FFEBEE' },
  labour: { color: '#1976D2', bg: '#E3F2FD' },
  property: { color: '#00897B', bg: '#E0F2F1' },
  consumer: { color: '#5E35B1', bg: '#EDE7F6' },
  family: { color: '#E91E63', bg: '#FCE4EC' },
  cyber: { color: '#FF9933', bg: '#FFF3E0' },
}

const URGENCY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  high: { color: '#D32F2F', bg: '#FFEBEE', label: '🚨 High Urgency' },
  medium: { color: '#FF9933', bg: '#FFF3E0', label: '⚡ Medium Urgency' },
  low: { color: '#2E7D32', bg: '#E8F5E9', label: '✅ Low Urgency' },
}

const SAMPLE_CASES = [
  'My employer has not paid salary for 3 months and is threatening to fire me',
  'The builder took my money but has not given possession of my flat for 2 years',
  'Someone used my OTP to steal money from my bank account online',
  'My husband is physically abusing me. I need divorce and child custody help',
  'I was arrested without proper FIR. Need bail and legal help urgently',
  'Bought defective AC worth ₹50,000. Company refusing to refund or replace',
]

// ── Sub-components ────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={12} fill={s <= Math.round(rating) ? 'var(--saffron)' : 'none'} style={{ color: 'var(--saffron)' }} />
      ))}
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginLeft: 2 }}>{rating.toFixed(1)}</span>
    </div>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} title={`Copy ${label}`}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', transition: 'color 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--saffron)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}>
      {copied ? <Check size={14} style={{ color: 'var(--green-success)' }} /> : <Copy size={14} />}
    </button>
  )
}

function CaseAnalysisCard({ analysis }: { analysis: CaseAnalysis }) {
  const typeConfig = CASE_TYPE_COLORS[analysis.primary_case_type] || { color: 'var(--navy)', bg: 'var(--bg-page)' }
  const urgencyConfig = URGENCY_CONFIG[analysis.urgency] || URGENCY_CONFIG.medium
  const TypeIcon = CASE_TYPE_ICONS[analysis.primary_case_type] || Scale

  return (
    <div className="gov-card-static slide-up" style={{ padding: '24px', borderLeft: `4px solid ${typeConfig.color}`, animationDelay: '0.1s' }}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} style={{ color: 'var(--saffron)' }} />
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--navy)' }}>
          AI Case Analysis
        </h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Case Type */}
        <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-lg)', background: typeConfig.bg, border: `1px solid ${typeConfig.color}20` }}>
          <div className="flex items-center gap-2 mb-1">
            <TypeIcon size={14} style={{ color: typeConfig.color }} />
            <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: typeConfig.color }}>Case Type</span>
          </div>
          <p style={{ fontSize: '0.9375rem', fontWeight: 800, color: typeConfig.color, textTransform: 'capitalize' }}>
            {analysis.primary_case_type}
          </p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: 2 }}>{analysis.sub_issue}</p>
        </div>

        {/* Urgency */}
        <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-lg)', background: urgencyConfig.bg, border: `1px solid ${urgencyConfig.color}20` }}>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: urgencyConfig.color }}>Urgency</span>
          <p style={{ fontSize: '0.9375rem', fontWeight: 800, color: urgencyConfig.color, marginTop: 4 }}>
            {urgencyConfig.label}
          </p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: 2 }}>{analysis.urgency_reason}</p>
        </div>
      </div>

      {/* Case summary */}
      {analysis.case_summary && (
        <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-page)', marginBottom: 12 }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>Summary: </span>
            {analysis.case_summary}
          </p>
        </div>
      )}

      {/* Info row */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {analysis.recommended_courts?.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Building2 size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <strong>Courts:</strong> {analysis.recommended_courts.join(', ')}
            </span>
          </div>
        )}
        {analysis.estimated_timeline && (
          <div className="flex items-center gap-1.5">
            <Clock size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <strong>Timeline:</strong> {analysis.estimated_timeline}
            </span>
          </div>
        )}
        {analysis.free_legal_aid_eligible && (
          <div className="flex items-center gap-1.5" style={{ color: 'var(--green-success)' }}>
            <CheckCircle size={13} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Free Legal Aid Eligible</span>
          </div>
        )}
      </div>

      {/* Key facts */}
      {analysis.key_facts?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {analysis.key_facts.slice(0, 4).map((f, i) => (
            <span key={i} style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function LawyerCard({ lawyer, rank }: { lawyer: LawyerProfile; rank: number }) {
  const [expanded, setExpanded] = useState(false)
  const typeColors = CASE_TYPE_COLORS[lawyer.specialization[0]] || { color: 'var(--navy)', bg: 'var(--bg-page)' }

  return (
    <div className="gov-card-static slide-up" style={{ padding: '20px', animationDelay: `${rank * 0.07}s`, transition: 'box-shadow 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}>

      {/* Rank badge + FREE badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, background: rank === 1 ? 'linear-gradient(135deg, var(--saffron), var(--saffron-dark))' : rank === 2 ? '#E0E7FF' : 'var(--bg-page)', color: rank === 1 ? '#FFF' : rank === 2 ? '#4338CA' : 'var(--text-muted)', border: rank > 2 ? '1px solid var(--border)' : 'none' }}>
            {rank === 1 ? '🏆' : `#${rank}`}
          </div>
          {lawyer.is_free && (
            <span style={{ fontSize: '0.625rem', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--green-light)', color: 'var(--green-success)', border: '1px solid rgba(46,125,50,0.2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              FREE AID
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {lawyer.available && (
            <div className="flex items-center gap-1">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green-success)' }} />
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--green-success)' }}>Available</span>
            </div>
          )}
        </div>
      </div>

      {/* Name + Court */}
      <div className="flex items-start gap-4 mb-3">
        <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-lg)', background: typeColors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.375rem' }}>
          ⚖️
        </div>
        <div className="flex-1 min-w-0">
          <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.3 }}>
            {lawyer.name}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {lawyer.court} · {lawyer.experience_years} yrs exp
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <StarRating rating={lawyer.rating} />
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--green-success)' }}>{lawyer.success_rate}% win rate</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{lawyer.cases_won}/{lawyer.total_cases} cases</span>
          </div>
        </div>
      </div>

      {/* Location + fees */}
      <div className="flex items-start gap-x-6 gap-y-1.5 flex-wrap mb-3">
        <div className="flex items-center gap-1.5">
          <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{lawyer.city}, {lawyer.state}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Award size={13} style={{ color: 'var(--saffron)' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: lawyer.is_free ? 'var(--green-success)' : 'var(--text-primary)' }}>
            {lawyer.fees_range}
          </span>
        </div>
      </div>

      {/* Specializations */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {lawyer.specialization.slice(0, 4).map(s => (
          <span key={s} style={{ fontSize: '0.625rem', fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: typeColors.bg, color: typeColors.color, textTransform: 'capitalize', letterSpacing: '0.03em' }}>
            {s.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {/* Contact buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <a href={`tel:${lawyer.phone}`}
          className="flex items-center justify-center gap-2"
          style={{ padding: '10px 16px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--green-success), #1B5E20)', color: '#FFF', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700, transition: 'opacity 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
          <Phone size={15} /> Call Now
        </a>
        <a href={`mailto:${lawyer.email}?subject=Legal Consultation Request&body=Dear ${lawyer.name},%0A%0AI found your profile on NyayaMitra and would like to schedule a consultation.`}
          className="flex items-center justify-center gap-2"
          style={{ padding: '10px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-page)', border: '1.5px solid var(--border)', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700, transition: 'border-color 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--navy)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}>
          <Mail size={15} /> Email
        </a>
      </div>

      {/* Contact info row */}
      <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-page)', marginBottom: 10 }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Phone size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)', fontFamily: 'monospace' }}>{lawyer.phone}</span>
          </div>
          <CopyButton text={lawyer.phone} label="phone" />
        </div>
      </div>

      {/* Expand toggle */}
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 w-full justify-center"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 600, padding: '4px', transition: 'color 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--navy)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}>
        {expanded ? 'Show less' : 'View full profile'}
        <ChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="fade-in" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>{lawyer.bio}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: Building2, label: 'Bar Council ID', value: lawyer.bar_council_id },
              { icon: MapPin, label: 'Office', value: lawyer.office_address },
              { icon: Clock, label: 'Availability', value: lawyer.available_slots.join(' · ') },
              { icon: BookOpen, label: 'Languages', value: lawyer.languages.join(', ') },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-2">
                <item.icon size={13} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</span>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 1 }}>{item.value}</p>
                </div>
              </div>
            ))}
            {lawyer.notable_cases.length > 0 && (
              <div className="flex items-start gap-2">
                <BookOpen size={13} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notable Cases</span>
                  {lawyer.notable_cases.map((c, i) => (
                    <p key={i} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 1 }}>· {c}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LawyerFinder() {
  const { language, userState, nyayaScore } = useAppStore()

  const [description, setDescription] = useState('')
  const [selectedState, setSelectedState] = useState(userState || 'All India')
  const [selectedCity, setSelectedCity] = useState('')
  const [needFree, setNeedFree] = useState(false)
  const [budgetMax, setBudgetMax] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<FindLawyersResponse | null>(null)
  const [voiceLoading, setVoiceLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSearch = async () => {
    if (!description.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await findLawyers({
        case_description: description,
        preferred_state: selectedState !== 'All India' ? selectedState : undefined,
        preferred_city: selectedCity.trim() || undefined,
        budget_max: budgetMax ? parseInt(budgetMax) : undefined,
        need_free_aid: needFree,
        limit: 5,
      })
      setResult(res)
    } catch {
      setError('Failed to find lawyers. Please check if the backend is running.')
    } finally {
      setLoading(false) }
  }

  const handleVoice = async (blob: Blob) => {
    setVoiceLoading(true)
    try {
      const res = await voiceAsk(blob, language, userState, nyayaScore)
      if (res.question_text) {
        setDescription(res.question_text)
        textareaRef.current?.focus()
      }
    } catch { /* ignore */ }
    finally { setVoiceLoading(false) }
  }

  const handleSampleCase = (sample: string) => {
    setDescription(sample)
    textareaRef.current?.focus()
  }

  return (
    <div id="lawyer-finder-page" className="page-wrapper">

      {/* Header */}
      <div className="mb-6 slide-up">
        <div className="flex items-center gap-3 mb-2">
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--navy), var(--navy-light))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scale size={22} color="#FFF" />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.02em' }}>
              AI Lawyer Finder
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Describe your case — our AI matches you with the best lawyers
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT: Search & Results ──────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Search card */}
          <div className="gov-card-static slide-up" style={{ padding: 24 }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)', display: 'block', marginBottom: 8 }}>
              Describe your legal problem *
            </label>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <textarea
                ref={textareaRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g., My employer hasn't paid my salary for 3 months and fired me without notice..."
                rows={4}
                className="input-gov"
                style={{ resize: 'vertical', minHeight: 100, paddingRight: 52, lineHeight: 1.6 }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSearch() }}
              />
              {/* Mic button overlay */}
              <div style={{ position: 'absolute', right: 12, bottom: 12 }}>
                <MicButton onRecordingComplete={handleVoice} disabled={voiceLoading || loading} size="sm" />
              </div>
            </div>

            {/* Filters row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>State</label>
                <select value={selectedState} onChange={e => setSelectedState(e.target.value)} className="input-gov" style={{ height: 40, padding: '0 12px', fontSize: '0.8125rem' }}>
                  {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>City (optional)</label>
                <input type="text" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
                  placeholder="e.g. Mumbai" className="input-gov" style={{ height: 40, padding: '0 12px', fontSize: '0.8125rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Max fee/hearing (₹)</label>
                <input type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)}
                  placeholder="e.g. 10000" className="input-gov" style={{ height: 40, padding: '0 12px', fontSize: '0.8125rem' }} />
              </div>
            </div>

            {/* Free aid toggle */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setNeedFree(!needFree)}
                style={{ width: 40, height: 22, borderRadius: 'var(--radius-full)', background: needFree ? 'var(--green-success)' : 'var(--border)', transition: 'background 0.3s', border: 'none', cursor: 'pointer', position: 'relative' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#FFF', position: 'absolute', top: 3, left: needFree ? 21 : 3, transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Show only FREE legal aid advocates (DLSA Panel)
              </span>
            </div>

            {error && (
              <div className="flex items-center gap-2 mb-3 p-3 rounded-lg" style={{ background: 'var(--red-light)', border: '1px solid rgba(211,47,47,0.15)' }}>
                <AlertTriangle size={15} style={{ color: 'var(--red-danger)', flexShrink: 0 }} />
                <p style={{ fontSize: '0.8125rem', color: 'var(--red-danger)' }}>{error}</p>
              </div>
            )}

            <button onClick={handleSearch} disabled={loading || !description.trim()} className="btn-primary w-full"
              style={{ fontSize: '1rem', padding: '14px 24px', minHeight: 52 }}>
              {loading
                ? <><Loader2 size={20} className="animate-spin" /> AI is analyzing your case...</>
                : <><Search size={20} /> Find Best Lawyers</>}
            </button>
          </div>

          {/* Loading shimmer */}
          {loading && (
            <div className="gov-card-static" style={{ padding: 24 }}>
              <div className="flex items-center gap-3 mb-4">
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--saffron)' }} />
                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--navy)' }}>AI is analyzing your case...</p>
              </div>
              {['Step 1: Understanding your legal situation', 'Step 2: Classifying case type and urgency', 'Step 3: Matching lawyers by specialization & location'].map((_step, i) => (
                <div key={i} className="flex items-center gap-3 mb-2">
                  <div className="shimmer" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                  <div className="shimmer flex-1" style={{ height: 14, borderRadius: 4 }} />
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <CaseAnalysisCard analysis={result.case_analysis} />

              <div className="flex items-center justify-between">
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 700, color: 'var(--navy)' }}>
                  {result.total_matched} Matched Lawyers
                </h2>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Ranked by AI match score
                </span>
              </div>

              {result.lawyers.map((lawyer, i) => (
                <LawyerCard key={lawyer.id} lawyer={lawyer} rank={i + 1} />
              ))}

              {result.total_matched === 0 && (
                <div className="gov-card-static" style={{ padding: 32, textAlign: 'center' }}>
                  <Scale size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.4 }} />
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>No lawyers found for your criteria</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 6 }}>Try broadening your state or removing the budget filter</p>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--saffron-light)', border: '1px solid rgba(255,153,51,0.2)' }}>
                <AlertTriangle size={15} style={{ color: 'var(--saffron-dark)', flexShrink: 0 }} />
                <p style={{ fontSize: '0.6875rem', color: 'var(--saffron-dark)' }}>
                  Contact information is sourced from public Bar Council records. Always verify credentials at <strong>barcouncilofindia.org</strong> before retaining. For free legal aid, call NALSA: <strong>15100</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Sidebar panels ──────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 24 }}>

          {/* Sample cases */}
          <div className="gov-card-static slide-up" style={{ padding: '20px', animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} style={{ color: 'var(--saffron)' }} />
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--navy)' }}>Try a sample case</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SAMPLE_CASES.map((sc, i) => (
                <button key={i} onClick={() => handleSampleCase(sc)}
                  className="text-left w-full"
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-page)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--saffron)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                  "{sc.length > 70 ? sc.slice(0, 70) + '…' : sc}"
                </button>
              ))}
            </div>
          </div>

          {/* Case types guide */}
          <div className="gov-card-static slide-up" style={{ padding: '20px', animationDelay: '0.15s' }}>
            <div className="flex items-center gap-2 mb-3">
              <Filter size={14} style={{ color: 'var(--navy)' }} />
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--navy)' }}>Case Type Guide</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(CASE_TYPE_COLORS).map(([caseType, { color, bg }]) => {
                const Icon = CASE_TYPE_ICONS[caseType] || Scale
                return (
                  <div key={caseType} className="flex items-center gap-3" style={{ padding: '6px 0' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} style={{ color }} />
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{caseType}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* NALSA helpline */}
          <div className="slide-up" style={{ borderRadius: 'var(--radius-xl)', padding: '16px 20px', background: 'linear-gradient(135deg, var(--navy), var(--navy-light))', animationDelay: '0.2s' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Free Legal Aid
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FFF', letterSpacing: '-0.02em', fontFamily: "'Poppins', sans-serif" }}>
              📞 15100
            </p>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
              NALSA National Legal Services Authority<br />
              Free legal aid for economically weaker sections<br />
              Available Mon–Sat, 10AM–5PM
            </p>
            <a href="tel:15100" className="flex items-center justify-center gap-2 mt-3"
              style={{ padding: '10px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--saffron)', color: '#FFF', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700, transition: 'opacity 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
              <Phone size={15} /> Call NALSA Now
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
