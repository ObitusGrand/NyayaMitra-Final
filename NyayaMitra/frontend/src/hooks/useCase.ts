// useCase.ts — Hook for case CRUD, event tracking, limitation countdown
import { v4 as uuidv4 } from 'uuid'
import { useAppStore, type TimelineEvent } from '@/store/useAppStore'

const DEFAULT_LIMITATION_DAYS = 90

export function useCase() {
  const { cases, addCase, updateCase } = useAppStore()

  const createCase = (payload: { title: string; type: string; status?: 'active' | 'resolved' | 'pending' }) => {
    const now = new Date().toLocaleDateString('en-IN')
    addCase({
      id: uuidv4(),
      title: payload.title,
      type: payload.type,
      status: payload.status ?? 'active',
      createdAt: now,
      lastActivity: now,
      timeline: [
        {
          id: uuidv4(),
          date: now,
          title: 'Case registered',
          description: `Case '${payload.title}' created in NyayaMitra`,
          type: 'filed',
        },
      ],
      relatedActs: [],
      winProbability: 50,
    })
  }

  const addEvent = (caseId: string, event: Omit<TimelineEvent, 'id'>) => {
    const found = cases.find((c) => c.id === caseId)
    if (!found) return

    const timeline = [...found.timeline, { ...event, id: uuidv4() }]
    updateCase(caseId, {
      timeline,
      lastActivity: event.date,
    })
  }

  const getLimitationDaysLeft = (caseId: string, limitationDays = DEFAULT_LIMITATION_DAYS): number => {
    const found = cases.find((c) => c.id === caseId)
    if (!found) return limitationDays

    const origin = new Date(found.createdAt)
    const now = new Date()
    const elapsedDays = Math.floor((now.getTime() - origin.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, limitationDays - elapsedDays)
  }

  return { createCase, addEvent, getLimitationDaysLeft }
}
