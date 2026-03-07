
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full shadow-2xl">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-slate-400 mb-6">
              We encountered an unexpected error. Our team has been notified.
            </p>
            
            {this.state.error && (
              <div className="mb-6 p-4 bg-red-950/30 border border-red-900/50 rounded text-left overflow-auto max-h-60">
                <p className="text-red-400 font-mono text-xs mb-2">Debug Info (v-debug-01):</p>
                <p className="text-red-400 font-mono text-xs whitespace-pre-wrap">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                   <pre className="text-red-500/70 font-mono text-[10px] mt-2 whitespace-pre-wrap">
                     {this.state.errorInfo.componentStack}
                   </pre>
                )}
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button onClick={() => window.location.href = '/'} variant="outline" className="border-slate-700 hover:bg-slate-800">
                Go Home
              </Button>
              <Button onClick={this.handleReload} className="bg-purple-600 hover:bg-purple-700 gap-2">
                <RefreshCw className="w-4 h-4" /> Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
