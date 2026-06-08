import ErrorBoundary from './components/ErrorBoundary'
import JarvisHUD from './components/JarvisHUD'

export default function App() {
  return (
    <ErrorBoundary>
      <JarvisHUD />
    </ErrorBoundary>
  )
}
