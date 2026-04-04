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

export interface ActivityEntry {
  id: string
  type: 'voice_query' | 'doc_decoded' | 'case_added' | 'score_computed' | 'fir_generated' | 'negotiation'
  title: string
  timestamp: string // ISO string
  xpEarned: number
}

// ── Slice Interfaces ─────────────────────────────────────────────────────────

interface ConfigSlice {
  language: Language
  setLanguage: (lang: Language) => void
  userState: string
  setUserState: (state: string) => void
  backendOnline: boolean
  setBackendOnline: (v: boolean) => void
}

interface CaseSlice {
  cases: Case[]
  addCase: (c: Case) => void
  updateCase: (id: string, updates: Partial<Case>) => void
  removeCase: (id: string) => void
}

interface DocumentSlice {
  decodedClauses: ClauseData[]
  addDecodedClauses: (clauses: ClauseData[]) => void
  documentsDecoded: number
  incrementDocumentsDecoded: () => void
}

interface FeatureSlice {
  lastResult: VoiceResponse | null
  setLastResult: (result: VoiceResponse | null) => void
  nyayaScore: number | null
  setNyayaScore: (score: number | null) => void
  policeMode: boolean
  setPoliceMode: (v: boolean) => void
}

interface GamificationSlice {
  totalXP: number
  activityLog: ActivityEntry[]
  activeDays: string[] // ISO date strings (YYYY-MM-DD) of active days
  logActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
  voiceQueriesCount: number
  incrementVoiceQueries: () => void
}

type AppState = ConfigSlice & CaseSlice & DocumentSlice & FeatureSlice & GamificationSlice

// ── Store Assembly ───────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Config Slice
      language: 'hi',
      setLanguage: (language) => set({ language }),
      userState: 'Central',
      setUserState: (userState: string) => set({ userState }),
      backendOnline: false,
      setBackendOnline: (backendOnline) => set({ backendOnline }),

      // Case Slice
      cases: [],
      addCase: (c) => set((state) => ({ cases: [c, ...state.cases] })),
      updateCase: (id, updates) =>
        set((state) => ({
          cases: state.cases.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      removeCase: (id) =>
        set((state) => ({ cases: state.cases.filter((c) => c.id !== id) })),

      // Document Slice
      decodedClauses: [],
      addDecodedClauses: (newClauses) => set((state) => ({ decodedClauses: [...state.decodedClauses, ...newClauses] })),
      documentsDecoded: 0,
      incrementDocumentsDecoded: () => set((state) => ({ documentsDecoded: state.documentsDecoded + 1 })),

      // Feature Slice
      lastResult: null,
      setLastResult: (lastResult) => set({ lastResult }),
      nyayaScore: null,
      setNyayaScore: (nyayaScore) => set({ nyayaScore }),
      policeMode: false,
      setPoliceMode: (policeMode) => set({ policeMode }),

      // Gamification Slice
      totalXP: 0,
      activityLog: [],
      activeDays: [],
      voiceQueriesCount: 0,
      incrementVoiceQueries: () => set((state) => ({ voiceQueriesCount: state.voiceQueriesCount + 1 })),
      logActivity: (entry) => set((state) => {
        const today = new Date().toISOString().split('T')[0]
        const newEntry: ActivityEntry = {
          ...entry,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
        }
        return {
          totalXP: state.totalXP + entry.xpEarned,
          activityLog: [newEntry, ...state.activityLog].slice(0, 50), // keep last 50
          activeDays: state.activeDays.includes(today)
            ? state.activeDays
            : [...state.activeDays, today].slice(-30), // keep last 30 days
        }
      }),
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
        totalXP: state.totalXP,
        activityLog: state.activityLog,
        activeDays: state.activeDays,
        voiceQueriesCount: state.voiceQueriesCount,
      }),
    }
  )
)
