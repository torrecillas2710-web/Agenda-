import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#04060f', color: '#00d4ff',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24, fontFamily: 'monospace', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>
            ERROR DE JARVIS
          </div>
          <div style={{
            background: 'rgba(255,51,85,0.1)', border: '1px solid rgba(255,51,85,0.4)',
            borderRadius: 6, padding: 16, fontSize: 12, color: '#ff3355',
            maxWidth: 340, wordBreak: 'break-word',
          }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20, padding: '10px 20px',
              background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.4)',
              borderRadius: 4, color: '#00d4ff', cursor: 'pointer', fontSize: 12,
            }}
          >
            REINICIAR
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
