// Zustand global store — NyayaMitra app state
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VoiceResponse, ClauseData } from '@/services/api'

// ── Types ─────────────────────────────────────────────────────────────────────
export type Language = 'hi' | 'en' | 'mr' | 'ta' | 'bn' | 'te' | 'gu' | 'kn'

export const LANG_LABELS: Record<Language, string> = {
  hi: 'हिंदी',
  en: 'English',
  mr: 'मराठी',
  ta: 'தமிழ்',
  bn: 'বাংলা',
  te: 'తెలుగు',
  gu: 'ગુજરાતી',
  kn: 'ಕನ್ನಡ',
}

export interface Case {
  id: string
  title: string
  type: string
  status: 'active' | 'resolved' | 'pending'
  createdAt: string
  lastActivity: string
  timeline: TimelineEvent[]
  relatedActs: string[]
  winProbability: number
}

export interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
  type: 'filed' | 'hearing' | 'order' | 'notice' | 'update'
}

interface AppState {
  // Language
  language: Language
  setLanguage: (lang: Language) => void

  // User State for localized rules
  userState: string
  setUserState: (state: string) => void

  // Last query result
  lastResult: VoiceResponse | null
  setLastResult: (result: VoiceResponse | null) => void

  // Cases
  cases: Case[]
  addCase: (c: Case) => void
  updateCase: (id: string, updates: Partial<Case>) => void
  removeCase: (id: string) => void

  // Decoded clauses for global score calculation
  decodedClauses: ClauseData[]
  addDecodedClauses: (clauses: ClauseData[]) => void
  documentsDecoded: number
  incrementDocumentsDecoded: () => void

  // NyayaScore
  nyayaScore: number | null
  setNyayaScore: (score: number | null) => void

  // Police mode
  policeMode: boolean
  setPoliceMode: (v: boolean) => void

  // Backend status
  backendOnline: boolean
  setBackendOnline: (v: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: 'hi',
      setLanguage: (language) => set({ language }),

      userState: 'Central',
      setUserState: (userState: string) => set({ userState }),

      lastResult: null,
      setLastResult: (lastResult) => set({ lastResult }),

      cases: [],
      addCase: (c) => set((state) => ({ cases: [c, ...state.cases] })),
      updateCase: (id, updates) =>
        set((state) => ({
          cases: state.cases.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      removeCase: (id) =>
        set((state) => ({ cases: state.cases.filter((c) => c.id !== id) })),

      decodedClauses: [],
      addDecodedClauses: (newClauses) => set((state) => ({ decodedClauses: [...state.decodedClauses, ...newClauses] })),
      
      documentsDecoded: 0,
      incrementDocumentsDecoded: () => set((state) => ({ documentsDecoded: state.documentsDecoded + 1 })),

      nyayaScore: null,
      setNyayaScore: (nyayaScore) => set({ nyayaScore }),

      policeMode: false,
      setPoliceMode: (policeMode) => set({ policeMode }),

      backendOnline: false,
      setBackendOnline: (backendOnline) => set({ backendOnline }),
    }),
    {
      name: 'nyayamitra-store',
      partialize: (state) => ({
        language: state.language,
        userState: state.userState,
        cases: state.cases,
        decodedClauses: state.decodedClauses,
        documentsDecoded: state.documentsDecoded,
        nyayaScore: state.nyayaScore,
      }),
    }
  )
)
