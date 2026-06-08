import { useCallback, useRef, useState } from 'react'
import { voiceAPI } from '../services/api'

export function useMediaRecorder({ onResult }: { onResult?: (text: string) => void } = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isSupported =
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia

  const getMimeType = () => {
    for (const type of ['audio/webm', 'audio/mp4', 'audio/ogg']) {
      if (MediaRecorder.isTypeSupported(type)) return type
    }
    return ''
  }

  const stopRecording = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current)
      vadIntervalRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []

      // Voice activity detection via Web Audio API
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const data = new Uint8Array(analyser.frequencyBinCount)
      let speechStarted = false
      let silenceFrames = 0
      const SILENCE_THRESHOLD = 12
      const SILENCE_FRAMES = 18 // ~900ms de silencio

      vadIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(data)
        const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length)
        if (rms > SILENCE_THRESHOLD) {
          speechStarted = true
          silenceFrames = 0
        } else if (speechStarted) {
          silenceFrames++
          if (silenceFrames >= SILENCE_FRAMES) {
            stopRecording()
          }
        }
      }, 50)

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setIsRecording(false)
        if (chunksRef.current.length === 0) return
        setIsTranscribing(true)
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
          const text = await voiceAPI.transcribe(blob, mimeType)
          if (text?.trim()) onResult?.(text.trim())
        } catch {
          setError('Error al transcribir')
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch {
      setError('Sin acceso al micrófono')
    }
  }, [onResult, stopRecording])

  return { isSupported, isRecording, isTranscribing, error, startRecording, stopRecording }
}
