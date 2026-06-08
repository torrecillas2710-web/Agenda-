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

  useEffect(() => { conversationRef.current = conversationMode }, [conversationMode])

  useEffect(() => {
    if (!isSpeaking && conversationRef.current && !isRecording && !isTranscribing && !isProcessing) {
      const t = setTimeout(() => { if (conversationRef.current) startRecording() }, 700)
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
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
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

  const voiceState = isRecording ? 'listening' : (isTranscribing || isProcessing) ? 'thinking' : isSpeaking ? 'speaking' : 'idle'

  const voiceLabel = {
    listening: 'Escuchando...',
    thinking: 'Procesando...',
    speaking: 'JARVIS habla',
    idle: conversationMode ? 'Modo voz activo' : 'Toca para hablar',
  }[voiceState]

  return (
    <>
      <div className="panel-title-bar">
        <span>Chat</span>
        <span className="panel-badge">{messages.length} mensajes</span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-chat">
            <div className="empty-chat-icon">J</div>
            <h3>JARVIS listo</h3>
            <p>Tu asistente personal con memoria, tareas y conversación por voz.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`msg-row ${msg.role}`}>
            <div className="msg-avatar">
              {msg.role === 'assistant' ? 'J' : '👤'}
            </div>
            <div>
              <div className="msg-bubble">
                {msg.role === 'assistant'
                  ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                  : <span>{msg.content}</span>
                }
              </div>
              <div className="msg-time">{formatTime(msg.timestamp)}</div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="msg-row assistant">
            <div className="msg-avatar">J</div>
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {isSupported && (
        <div className="voice-orb-wrapper">
          <button
            className={`voice-orb${voiceState !== 'idle' ? ` ${voiceState}` : ''}`}
            onClick={toggleConversation}
          >
            {voiceState === 'listening' ? '🎙' : voiceState === 'thinking' ? '⏳' : voiceState === 'speaking' ? '🔊' : '🎙'}
          </button>
          <div className={`voice-label${voiceState !== 'idle' ? ` ${voiceState}` : ''}`}>
            {voiceLabel}
          </div>
          {voiceError && <div className="voice-error">{voiceError}</div>}
        </div>
      )}

      <div className="input-area">
        <div className="input-row">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            value={input}
            onChange={(e) => { setInput(e.target.value); adjustTextarea() }}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            disabled={isProcessing || isRecording}
          />
          <button
            className="send-btn"
            onClick={() => handleSend()}
            disabled={isProcessing || !input.trim()}
          >
            ↑
          </button>
        </div>
      </div>
    </>
  )
}
