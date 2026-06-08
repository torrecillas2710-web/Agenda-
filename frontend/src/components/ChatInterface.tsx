import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import { useJarvisStore } from '../store/jarvisStore'
import { useSpeech } from '../hooks/useVoice'
import { useMediaRecorder } from '../hooks/useMediaRecorder'
import { format } from 'date-fns'

export default function ChatInterface() {
  const { messages, isProcessing, sendMessage } = useJarvisStore()
  const [input, setInput] = useState('')
  const [conversationMode, setConversationMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const conversationRef = useRef(false)

  const { isSpeaking, speak, stop: stopSpeaking, unlock } = useSpeech()

  const { isSupported, isRecording, isTranscribing, error: voiceError, startRecording, stopRecording } = useMediaRecorder({
    onResult: (transcript) => {
      setInput(transcript)
      setTimeout(() => handleSend(transcript), 200)
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isProcessing])

  // Modo conversación: cuando JARVIS termina de hablar, vuelve a escuchar
  useEffect(() => {
    conversationRef.current = conversationMode
  }, [conversationMode])

  useEffect(() => {
    if (!isSpeaking && conversationRef.current && !isRecording && !isTranscribing && !isProcessing) {
      const t = setTimeout(() => {
        if (conversationRef.current) startRecording()
      }, 600)
      return () => clearTimeout(t)
    }
  }, [isSpeaking])

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isProcessing) return
    setInput('')
    const response = await sendMessage(content)
    if (conversationRef.current && response) {
      const clean = response.replace(/[*_`#>\[\]()]/g, '').substring(0, 600)
      speak(clean)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const adjustTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const toggleConversation = () => {
    if (conversationMode) {
      setConversationMode(false)
      stopSpeaking()
      stopRecording()
    } else {
      unlock()
      setConversationMode(true)
      setTimeout(() => startRecording(), 300)
    }
  }

  const formatTime = (ts: string) => {
    try { return format(new Date(ts), 'HH:mm') } catch { return '' }
  }

  const voiceState = isRecording ? 'listening' : isTranscribing || isProcessing ? 'thinking' : isSpeaking ? 'speaking' : 'idle'

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">// CANAL DE COMUNICACIÓN</span>
        <span className="text-muted" style={{ fontSize: 10, fontFamily: 'var(--font-hud)' }}>
          {messages.length} MSG
        </span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">⬡</div>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: 11, letterSpacing: 2, color: 'var(--primary)', marginBottom: 4 }}>
              JARVIS ULTRA EN LÍNEA
            </div>
            <div>Listo para recibir instrucciones, Señor.</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
              Escribe o activa el modo conversación de voz
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message-row ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'assistant' ? '⬡' : '👤'}
            </div>
            <div>
              <div className="message-bubble">
                {msg.role === 'assistant' ? (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
              <div className="message-time">{formatTime(msg.timestamp)}</div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="message-row assistant processing-row">
            <div className="message-avatar">⬡</div>
            <div className="typing-dots">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Botón de modo conversación tipo Siri */}
      {isSupported && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
          <button
            onClick={toggleConversation}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: `2px solid ${voiceState === 'listening' ? 'var(--danger)' : voiceState === 'speaking' ? 'var(--primary)' : voiceState === 'thinking' ? '#a855f7' : 'var(--border)'}`,
              background: conversationMode
                ? voiceState === 'listening' ? 'rgba(239,68,68,0.15)' : voiceState === 'speaking' ? 'rgba(0,212,255,0.15)' : 'rgba(168,85,247,0.15)'
                : 'var(--surface)',
              cursor: 'pointer',
              fontSize: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: conversationMode ? `0 0 20px ${voiceState === 'listening' ? 'rgba(239,68,68,0.4)' : voiceState === 'speaking' ? 'rgba(0,212,255,0.4)' : 'rgba(168,85,247,0.3)'}` : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            {voiceState === 'listening' ? '🎙' : voiceState === 'thinking' ? '⏳' : voiceState === 'speaking' ? '🔊' : '🎙'}
          </button>
          <div style={{ marginTop: 6, fontSize: 9, fontFamily: 'var(--font-hud)', letterSpacing: 2, color: voiceState === 'listening' ? 'var(--danger)' : voiceState === 'speaking' ? 'var(--primary)' : voiceState === 'thinking' ? '#a855f7' : 'var(--text-dim)' }}>
            {voiceState === 'listening' ? '● ESCUCHANDO' : voiceState === 'thinking' ? '◌ PROCESANDO' : voiceState === 'speaking' ? '▶ JARVIS HABLA' : conversationMode ? 'MODO VOZ ACTIVO' : 'TOCA PARA HABLAR'}
          </div>
          {voiceError && (
            <div style={{ fontSize: 9, color: 'var(--danger)', fontFamily: 'var(--font-hud)', marginTop: 4 }}>⚠ {voiceError}</div>
          )}
        </div>
      )}

      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={(e) => { setInput(e.target.value); adjustTextarea() }}
            onKeyDown={handleKeyDown}
            placeholder="Enviar instrucción a JARVIS..."
            rows={1}
            disabled={isProcessing || isRecording}
          />
          <button
            className="btn-icon send"
            onClick={() => handleSend()}
            disabled={isProcessing || !input.trim()}
            title="Enviar (Enter)"
          >
            ➤
          </button>
        </div>
      </div>
    </>
  )
}
