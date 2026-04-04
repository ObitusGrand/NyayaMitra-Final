import { useState } from 'react'
import { textAsk, voiceAsk, type VoiceResponse } from '@/services/api'
import { useAppStore } from '@/store/useAppStore'

export function useVoice() {
	const { language, setLastResult } = useAppStore()
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const askByText = async (question: string): Promise<VoiceResponse | null> => {
		if (!question.trim()) return null
		setLoading(true)
		setError('')
		try {
			const res = await textAsk(question, language)
			setLastResult(res)
			return res
		} catch (e: unknown) {
			const err = e as { response?: { data?: { detail?: string } } }
			setError(err?.response?.data?.detail || 'Text query failed')
			return null
		} finally {
			setLoading(false)
		}
	}

	const askByVoice = async (audioBlob: Blob): Promise<VoiceResponse | null> => {
		setLoading(true)
		setError('')
		try {
			const res = await voiceAsk(audioBlob, language)
			setLastResult(res)
			return res
		} catch (e: unknown) {
			const err = e as { response?: { data?: { detail?: string } } }
			setError(err?.response?.data?.detail || 'Voice query failed')
			return null
		} finally {
			setLoading(false)
		}
	}

	return { askByText, askByVoice, loading, error }
}
