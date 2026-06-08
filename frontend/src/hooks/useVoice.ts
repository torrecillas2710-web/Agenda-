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
  const unlockedRef = useRef(false)

  useEffect(() => {
    const load = () => { voicesRef.current = window.speechSynthesis?.getVoices() || [] }
    load()
    window.speechSynthesis?.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load)
  }, [])

  const unlock = useCallback(() => {
    if (unlockedRef.current || !window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    window.speechSynthesis.speak(u)
    unlockedRef.current = true
  }, [])

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const voices = voicesRef.current

    // Prioridad: voz británica (como JARVIS de Iron Man) → español masculino → cualquier masculina
    const voice =
      voices.find((v) => v.name === 'Daniel') ||                          // British iOS
      voices.find((v) => v.name === 'Arthur') ||                          // British iOS 16+
      voices.find((v) => v.lang === 'en-GB') ||                           // cualquier inglés brit.
      voices.find((v) => v.name === 'Jorge') ||                           // español masculino
      voices.find((v) => v.lang.startsWith('es') && !v.name.includes('Monica') && !v.name.includes('Paulina')) ||
      voices.find((v) => !v.name.toLowerCase().includes('female')) ||
      voices[0]

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = voice?.lang || 'en-GB'
    utterance.rate = 0.82
    utterance.pitch = 0.55   // grave y autoritario
    utterance.volume = 1.0
    if (voice) utterance.voice = voice

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  return { isSpeaking, speak, stop, unlock }
}
