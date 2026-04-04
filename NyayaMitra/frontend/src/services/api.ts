// NyayaMitra API service layer — all backend calls centralized here
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
})

// Centralized Interceptors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Basic global intercept — ideally hooked into a Zustand global toast queue
    if (!error.response) {
      console.error('Network/Server error detected:', error)
      // Custom event to signify backend offline status
      window.dispatchEvent(new CustomEvent('nyaya-api-error', { detail: 'Network error. Please check your connection' }))
    } else if (error.response.status >= 500) {
      window.dispatchEvent(new CustomEvent('nyaya-api-error', { detail: 'Backend server is currently experiencing issues.' }))
    }
    return Promise.reject(error)
  }
)

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
export const voiceAsk = async (audioBlob: Blob, lang = 'hi', state = 'Central', nyayaScore: number | null = null): Promise<VoiceResponse> => {
  const form = new FormData()
  form.append('audio', audioBlob, 'recording.webm')
  form.append('lang', lang)
  form.append('state', state)
  if (nyayaScore !== null) form.append('nyayaScore', nyayaScore.toString())
  const { data } = await api.post<VoiceResponse>('/voice/ask', form)
  return data
}

export const textAsk = async (question: string, lang = 'hi', state = 'Central', nyayaScore: number | null = null): Promise<VoiceResponse> => {
  const payload: Record<string, unknown> = { question, lang, state }
  if (nyayaScore !== null) payload.nyayaScore = nyayaScore
  const { data } = await api.post<VoiceResponse>('/voice/text-ask', payload)
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
  documents_analysed?: number
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

// ── Evidence Scanner ─────────────────────────────────────────────────────────
export interface EvidenceResponse {
  extracted_text: string
  structured_data: Record<string, unknown>
  suggested_doc_type: string
  auto_fill_fields: Record<string, string>
}

export const scanEvidence = async (file: File): Promise<EvidenceResponse> => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<EvidenceResponse>('/doc/scan-evidence', form)
  return data
}

// ── Hidden Trap Detector ─────────────────────────────────────────────────────
export interface TrapItem {
  clause_index: number
  trap_type: string
  severity: string
  explanation: string
  affected_right: string
  law_reference: string
}

export interface TrapDetectorResponse {
  traps: TrapItem[]
  total_traps: number
  safety_score: number
}

export const detectHiddenTraps = async (clauses: ClauseData[], documentType: string): Promise<TrapDetectorResponse> => {
  const { data } = await api.post<TrapDetectorResponse>('/doc/hidden-traps', {
    clauses: clauses.map(c => ({ clause: c.clause, risk: c.risk, law_act: c.law_act })),
    document_type: documentType,
  })
  return data
}

// ── Lawyer Finder ───────────────────────────────────────────────────────────
export interface LawyerProfile {
  id: string
  name: string
  specialization: string[]
  state: string
  city: string
  district: string
  phone: string
  email: string
  bar_council_id: string
  experience_years: number
  languages: string[]
  court: string
  rating: number
  cases_won: number
  total_cases: number
  fees_range: string
  office_address: string
  available: boolean
  available_slots: string[]
  bio: string
  notable_cases: string[]
  success_rate: number
  is_free?: boolean
}

export interface CaseAnalysis {
  primary_case_type: string
  sub_issue: string
  urgency: 'high' | 'medium' | 'low'
  urgency_reason: string
  free_legal_aid_eligible: boolean
  preferred_specializations: string[]
  key_facts: string[]
  recommended_courts: string[]
  case_summary: string
  estimated_timeline: string
}

export interface FindLawyersResponse {
  case_analysis: CaseAnalysis
  lawyers: LawyerProfile[]
  total_matched: number
  search_params: Record<string, unknown>
  nalsa_helpline: string
  timestamp: string
}

export const findLawyers = async (payload: {
  case_description: string
  preferred_state?: string
  preferred_city?: string
  budget_max?: number
  need_free_aid?: boolean
  language_preference?: string
  limit?: number
}): Promise<FindLawyersResponse> => {
  const { data } = await api.post<FindLawyersResponse>('/lawyers/find', payload)
  return data
}

export const getLawyerContact = async (lawyerId: string): Promise<LawyerProfile> => {
  const { data } = await api.post<LawyerProfile>('/lawyers/contact', { lawyer_id: lawyerId })
  return data
}

export const getLawyerStates = async (): Promise<{ states: string[] }> => {
  const { data } = await api.get('/lawyers/states')
  return data
}

export default api
