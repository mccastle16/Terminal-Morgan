import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-6 max-w-lg text-center">
            <p className="text-sm font-semibold text-red-400 mb-2">Something went wrong</p>
            <p className="text-xs text-red-300/70 font-mono break-all">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-3 px-3 py-1.5 bg-red-500/20 text-red-400 text-xs rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
