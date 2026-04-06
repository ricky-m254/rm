import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  message?: string
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('UI error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white">
          <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
              <h1 className="text-xl font-display font-semibold">Something went wrong</h1>
              <p className="mt-2 text-sm text-rose-200">
                The frontend hit an unexpected error. Check the console for details.
              </p>
              {this.state.message ? (
                <p className="mt-4 text-xs text-rose-200/80">{this.state.message}</p>
              ) : null}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
