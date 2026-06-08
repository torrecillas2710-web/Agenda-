import { useCallback, useEffect, useRef, useState } from 'react'
import { useJarvisStore } from '../store/jarvisStore'
import { useSpeech } from '../hooks/useVoice'
import { voiceAPI } from '../services/api'

type Phase = 'starting' | 'listening' | 'thinking' | 'speaking'

interface Props { onExit: () => void }

export default function VoiceMode({ onExit }: Props) {
  const { sendMessage } = useJarvisStore()
  const { isSpeaking, speak, stop: stopSpeaking, unlock } = useSpeech()
  const [phase, setPhase] = useState<Phase>('starting')
  const [audioLevel, setAudioLevel] = useState(0)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const vadRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animRef = useRef<number>(0)
  const chunksRef = useRef<Blob[]>([])
  const activeRef = useRef(true)
  const phaseRef = useRef<Phase>('starting')

  const setPhaseSync = (p: Phase) => { phaseRef.current = p; setPhase(p) }

  const stopVAD = () => { if (vadRef.current) { clearInterval(vadRef.current); vadRef.current = null } }
  const stopCtx = () => {
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null }
    analyserRef.current = null
    cancelAnimationFrame(animRef.current)
    setAudioLevel(0)
  }

  const animateLevel = useCallback(() => {
    if (!analyserRef.current || !activeRef.current) return
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length)
    setAudioLevel(Math.min(rms / 35, 1))
    animRef.current = requestAnimationFrame(animateLevel)
  }, [])

  const startListening = useCallback(async () => {
    if (!activeRef.current) return
    setPhaseSync('listening')

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      onExit(); return
    }
    streamRef.current = stream

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const src = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    src.connect(analyser)
    analyserRef.current = analyser
    animRef.current = requestAnimationFrame(animateLevel)

    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    chunksRef.current = []

    const vadData = new Uint8Array(analyser.frequencyBinCount)
    let speechStarted = false; let silenceFrames = 0

    vadRef.current = setInterval(() => {
      if (!activeRef.current) return
      analyser.getByteFrequencyData(vadData)
      const rms = Math.sqrt(vadData.reduce((s, v) => s + v * v, 0) / vadData.length)
      if (rms > 12) { speechStarted = true; silenceFrames = 0 }
      else if (speechStarted && ++silenceFrames >= 18) {
        stopVAD(); recorder.stop()
      }
    }, 50)

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      stopCtx(); stopVAD()
      if (!activeRef.current || chunksRef.current.length === 0) { if (activeRef.current) startListening(); return }

      setPhaseSync('thinking')
      try {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        const text = await voiceAPI.transcribe(blob, mimeType)
        if (!activeRef.current) return
        if (!text?.trim()) { startListening(); return }

        const response = await sendMessage(text.trim())
        if (!activeRef.current || !response) return

        setPhaseSync('speaking')
        const clean = response.replace(/[*_`#>\[\]()]/g, '').substring(0, 700)
        speak(clean)
      } catch {
        if (activeRef.current) startListening()
      }
    }

    recorderRef.current = recorder
    recorder.start()
  }, [animateLevel, onExit, sendMessage, speak])

  // When JARVIS finishes speaking → listen again
  useEffect(() => {
    if (!isSpeaking && phaseRef.current === 'speaking' && activeRef.current) {
      const t = setTimeout(() => { if (activeRef.current) startListening() }, 600)
      return () => clearTimeout(t)
    }
  }, [isSpeaking, startListening])

  useEffect(() => {
    unlock()
    const t = setTimeout(() => startListening(), 400)
    return () => {
      activeRef.current = false
      clearTimeout(t)
      stopVAD(); stopCtx()
      recorderRef.current?.state === 'recording' && recorderRef.current.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const handleExit = () => {
    activeRef.current = false
    stopVAD(); stopCtx()
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    stopSpeaking()
    onExit()
  }

  const blobScale = phase === 'listening' ? 1 + audioLevel * 0.45 : phase === 'speaking' ? 1.12 : phase === 'thinking' ? 0.82 : 1
  const morphSpeed = phase === 'speaking' ? '2.5s' : phase === 'thinking' ? '7s' : '4s'
  const blobOpacity = phase === 'thinking' ? 0.65 : 1

  const statusText = { starting: 'Iniciando...', listening: 'Escuchando', thinking: 'Procesando...', speaking: 'JARVIS habla' }[phase]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
    >
      <style>{`
        @keyframes blob-morph {
          0%   { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          25%  { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
          50%  { border-radius: 50% 60% 30% 60% / 30% 60% 70% 40%; }
          75%  { border-radius: 60% 40% 50% 50% / 40% 30% 60% 70%; }
          100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
        }
        @keyframes blob-think {
          0%,100% { transform: scale(0.82); opacity: 0.5; }
          50%      { transform: scale(0.88); opacity: 0.7; }
        }
      `}</style>

      {/* Blob */}
      <div style={{
        width: 220,
        height: 220,
        background: 'white',
        borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
        animation: phase === 'thinking'
          ? 'blob-think 2s ease-in-out infinite'
          : `blob-morph ${morphSpeed} ease-in-out infinite`,
        transform: phase !== 'thinking' ? `scale(${blobScale})` : undefined,
        opacity: blobOpacity,
        transition: 'transform 0.08s ease, opacity 0.4s ease',
        pointerEvents: 'none',
      }} />

      {/* Status */}
      <div style={{ position: 'absolute', bottom: 140, color: 'rgba(255,255,255,0.65)', fontSize: 15, letterSpacing: 0.5 }}>
        {statusText}
      </div>

      {/* Cancel button */}
      <div style={{ position: 'absolute', bottom: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <button
          onClick={handleExit}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: '#ef4444', border: 'none',
            color: 'white', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Toca para cancelar</div>
      </div>
    </div>
  )
}
