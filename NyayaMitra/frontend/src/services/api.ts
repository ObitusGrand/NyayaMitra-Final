// NyayaMitra API service layer — all backend calls centralized here
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
})

// ── Types ────────────────────────────────────────────────────────────────────
export interface VoiceResponse {
  question_text: string
  answer: string
  answer_audio_b64: string
  confidence: number
  acts_cited: string[]
  law_source_urls: string[]
  low_confidence: boolean
  win_probability: number
  dlsa_recommended: boolean
  sections_cited: SectionCited[]
  language: string
}

export interface SectionCited {
  act: string
  section: string
  title: string
  relevance: number
  source_url: string
}

export interface ClauseData {
  clause: string
  risk: 'safe' | 'caution' | 'illegal'
  law_act: string
  law_section: string
  plain_hindi: string
  plain_english: string
  counter_clause: string | null
  source_url: string
}

export interface DecodeResponse {
  clauses: ClauseData[]
  document_type: string
  overall_risk: string
  total_clauses: number
  illegal_count: number
  caution_count: number
  safe_count: number
  extracted_text_preview: string
}

export interface GenerateResponse {
  doc_text: string
  doc_type: string
  acts_cited: string[]
  source_urls: string[]
  disclaimer: string
  word_count: number
}

export interface DocumentTypeOption {
  value: string
  label: string
  category: string
  primary_law: string
}

export interface NegotiationTurn {
  role: 'user' | 'opponent' | 'coach'
  text: string
}

export interface NegotiationResponse {
  opponent_reply: string
  coach_debrief: string
  rights_missed: string[]
  suggested_next_line: string
  leverage_score: number
}

export interface Amendment {
  title: string
  affected_act: string
  date: string
  gazette_number: string
  summary_hindi: string
  summary_english: string
  affected_case_types: string[]
  source_url: string
  old_text: string
  new_text: string
}

export interface NyayaScoreResponse {
  score: number
  components: {
    employment: { score: number; max_score: number; issues: string[] }
    rental: { score: number; max_score: number; issues: string[] }
    consumer: { score: number; max_score: number; issues: string[] }
    active_risk: { score: number; max_score: number; issues: string[] }
  }
  top_issues: { issue: string; points_lost: number; fix_action: string; law_section: string }[]
  improvement_tips: string[]
}

export interface BNSSection {
  section: string
  title: string
  punishment: string
  cognisable: boolean
}

export interface FIRResponse {
  fir_text: string
  sections_cited: string[]
  source_urls: string[]
  bnss_section_reference: string
}

// ── Voice ────────────────────────────────────────────────────────────────────
export const voiceAsk = async (audioBlob: Blob, lang = 'hi'): Promise<VoiceResponse> => {
  const form = new FormData()
  form.append('audio', audioBlob, 'recording.webm')
  form.append('lang', lang)
  const { data } = await api.post<VoiceResponse>('/voice/ask', form)
  return data
}

export const textAsk = async (question: string, lang = 'hi'): Promise<VoiceResponse> => {
  const { data } = await api.post<VoiceResponse>('/voice/text-ask', { question, lang })
  return data
}

export const sttOnly = async (audioBlob: Blob, lang = 'hi'): Promise<{ transcript: string }> => {
  const form = new FormData()
  form.append('audio', audioBlob, 'recording.webm')
  form.append('lang', lang)
  const { data } = await api.post('/voice/stt', form)
  return data
}

// ── Documents ────────────────────────────────────────────────────────────────
export const decodeDocument = async (file: File): Promise<DecodeResponse> => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<DecodeResponse>('/doc/decode', form)
  return data
}

export const generateDocument = async (
  docType: string,
  facts: Record<string, string>,
  lang = 'hi',
  state = 'Maharashtra'
): Promise<GenerateResponse> => {
  const { data } = await api.post<GenerateResponse>('/doc/generate', {
    doc_type: docType,
    facts,
    lang,
    state,
  })
  return data
}

export const getDocumentTypes = async (): Promise<{ types: DocumentTypeOption[]; total: number }> => {
  const { data } = await api.get('/doc/types')
  return data
}

// ── Negotiation coach ───────────────────────────────────────────────────────
export const negotiationRespond = async (payload: {
  scenario: string
  user_message: string
  lang?: string
  history?: NegotiationTurn[]
}): Promise<NegotiationResponse> => {
  const { data } = await api.post<NegotiationResponse>('/negotiation/respond', payload)
  return data
}

// ── Amendments ───────────────────────────────────────────────────────────────
export const getLatestAmendments = async (limit = 10): Promise<{ amendments: Amendment[]; total: number }> => {
  const { data } = await api.get('/amendments/latest', { params: { limit } })
  return data
}

export const getMyAmendments = async (caseTypes: string[]): Promise<{ amendments: Amendment[] }> => {
  const { data } = await api.get('/amendments/my', { params: { case_types: caseTypes.join(',') } })
  return data
}

// ── NyayaScore ───────────────────────────────────────────────────────────────
export const computeScore = async (payload: {
  clauses?: ClauseData[]
  active_cases?: number
  limitation_days_left?: number
}): Promise<NyayaScoreResponse> => {
  const { data } = await api.post<NyayaScoreResponse>('/score/compute', payload)
  return data
}

// ── Police / FIR ─────────────────────────────────────────────────────────────
export const identifyBNSSections = async (
  incident: string,
  lang = 'hi'
): Promise<{ sections: BNSSection[]; confidence: number }> => {
  const { data } = await api.post('/police/identify-sections', {
    incident_description: incident,
    lang,
  })
  return data
}

export const generateFIR = async (payload: {
  complainant_name: string
  complainant_address: string
  complainant_phone: string
  incident_description: string
  incident_date: string
  incident_location: string
  accused_details?: string
  bns_sections: string[]
  lang?: string
}): Promise<FIRResponse> => {
  const { data } = await api.post<FIRResponse>('/police/generate-fir', payload)
  return data
}

// ── Health ───────────────────────────────────────────────────────────────────
export const checkHealth = async (): Promise<boolean> => {
  try {
    await api.get('/')
    return true
  } catch {
    return false
  }
}

export default api
