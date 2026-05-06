import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

// MVP-2 UX: ловим необработанные ошибки React-дерева вместо белого экрана.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // В prod — отправить в Sentry или logger. Сейчас — console.
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="bg-card border border-border rounded-xl p-8 max-w-lg shadow-sm">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold mb-2">Что-то пошло не так</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Произошла ошибка в интерфейсе. Попробуйте обновить страницу или вернуться на
              главную.
            </p>
            <details className="mb-6 text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Технические детали
              </summary>
              <pre className="mt-2 p-3 bg-elevate-1 border border-border rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                {this.state.error.name}: {this.state.error.message}
                {this.state.error.stack && "\n\n" + this.state.error.stack}
              </pre>
            </details>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                Обновить страницу
              </button>
              <button
                onClick={this.reset}
                className="px-4 py-2 rounded-lg border border-border text-sm"
              >
                Попробовать снова
              </button>
              <a
                href="/"
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-elevate-1"
              >
                На главную
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
