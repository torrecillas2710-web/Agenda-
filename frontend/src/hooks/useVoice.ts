import { useCallback, useRef, useState, useEffect } from 'react'

interface UseVoiceOptions {
  onResult?: (transcript: string) => void
  onStart?: () => void
  onEnd?: () => void
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

export function useVoice({ onResult, onStart, onEnd }: UseVoiceOptions = {}) {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    setIsSupported(true)

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'es-MX'

    rec.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript
      setVoiceError(null)
      onResult?.(transcript)
    }
    rec.onstart = () => { setIsListening(true); setVoiceError(null); onStart?.() }
    rec.onend = () => { setIsListening(false); onEnd?.() }
    rec.onerror = (e: any) => {
      setIsListening(false)
      setVoiceError(e.error || 'error')
      onEnd?.()
    }

    recognitionRef.current = rec
  }, [])

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try { recognitionRef.current.start() } catch {}
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try { recognitionRef.current.stop() } catch {}
    }
  }, [isListening])

  return { isSupported: isSupported && !isIOS, isIOS, isListening, voiceError, startListening, stopListening }
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    const load = () => { voicesRef.current = window.speechSynthesis?.getVoices() || [] }
    load()
    window.speechSynthesis?.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load)
  }, [])

  const speak = useCallback((text: string, lang = 'es-ES') => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.88
    utterance.pitch = 0.82
    utterance.volume = 0.95

    const preferred = voicesRef.current.find(
      (v) => v.lang.startsWith('es') && v.name.toLowerCase().includes('google')
    )
    if (preferred) utterance.voice = preferred

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  return { isSpeaking, speak, stop }
}
