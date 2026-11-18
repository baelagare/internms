import { Component } from 'react';

// Last-resort safety net: an uncaught render error in any screen must surface
// a readable recovery screen instead of unmounting the whole app (blank page).
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('[InternMS] Uncaught render error:', error);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  handleDashboard = () => {
    const role = window.location.hash.replace(/^#\/?/, '').split('/')[0];
    if (role) window.location.hash = `#/${role}/dashboard`;
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const message = error instanceof Error && error.message ? error.message : 'An unexpected rendering problem occurred.';
    return (
      <main className="mx-auto max-w-lg p-8">
        <section role="alert" className="rounded-xl border border-red-200 bg-white p-6">
          <h1 className="text-xl font-bold">This screen hit a problem</h1>
          <p className="my-4 text-sm">{message}</p>
          <p className="mb-4 text-sm text-slate-600">The rest of the workspace is unaffected. Use the actions below to continue.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="rounded-lg bg-navy-900 px-4 py-3 text-sm font-bold text-white" onClick={this.handleRetry}>Try again</button>
            <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700" onClick={this.handleDashboard}>Back to dashboard</button>
            <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700" onClick={() => window.location.reload()}>Reload page</button>
          </div>
        </section>
      </main>
    );
  }
}
