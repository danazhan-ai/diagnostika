import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  componentDidCatch(error) {
    this.setState({ error })
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'Arial', color: 'red', background: '#07060f', minHeight: '100vh' }}>
          <h2>Ошибка в App.jsx</h2>
          <pre>{String(this.state.error)}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
