import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import { useJarvisStore } from '../store/jarvisStore'
import { useVoice, useSpeech } from '../hooks/useVoice'
import { format } from 'date-fns'

export default function ChatInterface() {
  const { messages, isProcessing, sendMessage } = useJarvisStore()
  const [input, setInput] = useState('')
  const [autoSpeak, setAutoSpeak] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { isSpeaking, speak, stop: stopSpeaking } = useSpeech()

  const { isSupported, isListening, voiceError, startListening, stopListening } = useVoice({
    onResult: (transcript) => {
      setInput(transcript)
      setTimeout(() => handleSend(transcript), 300)
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isProcessing])

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isProcessing) return
    setInput('')
    const response = await sendMessage(content)
    if (autoSpeak && response) {
      const clean = response.replace(/[*_`#>\[\]]/g, '').substring(0, 500)
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

  const formatTime = (ts: string) => {
    try { return format(new Date(ts), 'HH:mm') } catch { return '' }
  }

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">// CANAL DE COMUNICACIÓN</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className={`btn-icon${autoSpeak ? ' active' : ''}`}
            style={{ width: 32, height: 32, fontSize: 14 }}
            onClick={() => { setAutoSpeak(!autoSpeak); if (isSpeaking) stopSpeaking() }}
            title={autoSpeak ? 'Silenciar respuestas' : 'Leer respuestas en voz alta'}
          >
            {autoSpeak ? '🔊' : '🔇'}
          </button>
          <span className="text-muted" style={{ fontSize: 10, fontFamily: 'var(--font-hud)' }}>
            {messages.length} MSG
          </span>
        </div>
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
              Escribe un mensaje o usa el micrófono
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

      <div className="chat-input-area">
        <div className="chat-input-row">
          {isSupported && (
            <button
              className={`voice-btn${isListening ? ' listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              title={isListening ? 'Detener escucha' : 'Activar reconocimiento de voz'}
            >
              {isListening ? '⏹' : '🎙'}
            </button>
          )}

          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={(e) => { setInput(e.target.value); adjustTextarea() }}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Escuchando...' : 'Enviar instrucción a JARVIS...'}
            rows={1}
            disabled={isProcessing || isListening}
          />

          {isSpeaking ? (
            <button className="btn-icon active" onClick={stopSpeaking} title="Silenciar">
              ⏹
            </button>
          ) : (
            <button
              className="btn-icon send"
              onClick={() => handleSend()}
              disabled={isProcessing || !input.trim()}
              title="Enviar (Enter)"
            >
              ➤
            </button>
          )}
        </div>

        {isListening && (
          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--danger)', fontFamily: 'var(--font-hud)', letterSpacing: 2, textAlign: 'center' }}>
            ● ESCUCHANDO — HABLA AHORA
          </div>
        )}
        {voiceError && (
          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--danger)', fontFamily: 'var(--font-hud)', letterSpacing: 1, textAlign: 'center' }}>
            ⚠ VOZ: {voiceError}
          </div>
        )}
      </div>
    </>
  )
}
