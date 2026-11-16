import { Button, Card, Notice } from './ui.jsx';

export function Registration() {
  function handleReturn() {
    window.location.hash = '#/login';
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-canvas p-4 sm:p-6"
      aria-label="Student account access"
    >
      <div className="w-full max-w-auth space-y-6">
        <Card className="p-6 sm:p-8 space-y-6 shadow-none">
          <div className="text-center space-y-2">
            <img
              src="/internms-logo.svg"
              alt=""
              width="44"
              height="44"
              className="mx-auto h-11 w-11"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">InternMS</h1>
              <p className="text-xs font-semibold text-muted">
                North Eastern Mindanao State University
              </p>
              <p className="text-xs text-muted">Main Campus · Student Access</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold text-ink text-center">
              Student Account Provisioning
            </h2>
            <p className="text-sm text-muted leading-relaxed text-center">
              Student accounts are authorized directly through institutional Google Workspace sign-in (<code className="font-mono text-ink">@nemsu.edu.ph</code>). Manual password registration is not required.
            </p>
          </div>

          <Notice tone="info" title="Automatic Account Setup">
            Sign in with your official university Google account (<code className="font-mono text-ink">@nemsu.edu.ph</code>) on the sign-in page. Upon initial sign-in, you will declare your college and degree program, which connects your workspace directly to your College OJT Coordinator.
          </Notice>

          <Button
            variant="primary"
            onClick={handleReturn}
            className="w-full"
          >
            Return to Sign-In
          </Button>

          <footer className="border-t border-line pt-4 text-center text-xs text-muted">
            <p>© {new Date().getFullYear()} NEMSU · InternMS</p>
            <p className="mt-1 text-xs text-muted">
              Need assistance? [PLACEHOLDER] Contact your College OJT Coordinator
            </p>
          </footer>
        </Card>
      </div>
    </main>
  );
}
