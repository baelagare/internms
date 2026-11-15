import { useEffect, useId, useRef, useState } from 'react';
import { Button, Card, Notice } from './ui.jsx';
import { Field, Input } from './workflow.jsx';
import { GoogleIcon, Icon } from './Icons.jsx';

export function AuthScreen({ onLogin, onGoogleSignIn, busy, error }) {
  const [googleReady, setGoogleReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const googleButtonRef = useRef(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const emailId = useId();
  const passwordId = useId();

  useEffect(() => {
    const clientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || typeof document === 'undefined') return undefined;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    let resizeObserver;
    const renderGoogleButton = () => {
      const container = googleButtonRef.current;
      if (!container || !window.google?.accounts?.id) return;
      const availableWidth = Math.floor(container.getBoundingClientRect().width);
      if (availableWidth <= 0) return;
      container.replaceChildren();
      window.google.accounts.id.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: Math.min(360, availableWidth),
        text: 'continue_with'
      });
    };
    script.onload = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: response => onGoogleSignIn?.(response.credential) });
      renderGoogleButton();
      if (typeof ResizeObserver !== 'undefined' && googleButtonRef.current) {
        resizeObserver = new ResizeObserver(renderGoogleButton);
        resizeObserver.observe(googleButtonRef.current);
      }
      setGoogleReady(true);
    };
    script.onerror = () => setGoogleReady(false);
    document.head.appendChild(script);
    return () => {
      resizeObserver?.disconnect();
      script.remove();
    };
  }, [onGoogleSignIn]);

  const setField = key => event => {
    setForm(prev => ({ ...prev, [key]: event.target.value }));
  };

  const staticLink = event => event.preventDefault();

  function handleSubmit(event) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    onLogin?.(form.email, form.password, rememberMe);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] p-4 sm:p-8" aria-label="InternMS account access">
      <a
        href="#auth-card"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to sign in form
      </a>

      <div className="w-full max-w-[29rem]">
        <Card id="auth-card" className="rounded-2xl border-[#e3e6ee] bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.09)] sm:p-9">
          <header className="text-center">
            <img src="/internms-logo.svg" alt="" width="48" height="48" className="mx-auto h-12 w-12" />
            <p className="mt-1 text-xl font-bold tracking-wide text-ink">InternMS</p>
            <h1 className="mt-2 text-[1.75rem] font-bold tracking-[-0.03em] text-ink">Log in to your account</h1>
            <p className="mt-2 text-sm text-muted">Enter your email and password below to log in</p>
          </header>

          {error && <Notice tone="danger" title="Authentication error"><span>{error}</span></Notice>}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <Field id={emailId} label="Email address">
              <Input id={emailId} type="email" value={form.email} onChange={setField('email')} autoComplete="username" placeholder="user@example.com" required className="min-h-[52px] rounded-lg px-4 text-base" />
            </Field>

            <Field id={passwordId} label={<span className="flex items-center justify-between gap-3"><span>Password</span><a href="#forgot-password" onClick={staticLink} className="font-normal text-muted underline decoration-[#aeb5c2] underline-offset-4 hover:text-ink">Forgot password?</a></span>}>
              <div className="relative flex items-center">
                <Input id={passwordId} type={showPassword ? 'text' : 'password'} value={form.password} onChange={setField('password')} autoComplete="current-password" placeholder="Password" required className="min-h-[52px] rounded-lg px-4 pr-14 text-base" />
                <button type="button" aria-pressed={showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)} className="absolute right-2 inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-ink">
                  <Icon name="eye" size={20} />
                </button>
              </div>
            </Field>

            <label htmlFor="remember-me" className="flex cursor-pointer items-center gap-3 text-sm font-medium text-ink">
              <input id="remember-me" type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} className="h-5 w-5 rounded-md border-line text-accent focus:ring-accent" />
              Remember me
            </label>

            <Button type="submit" variant="primary" disabled={busy} loading={busy} loadingLabel="Logging in…" className="mt-2 min-h-[52px] w-full rounded-lg text-base font-bold">
              Log in
            </Button>
          </form>

          <div className="my-7 flex items-center gap-4 text-xs font-medium uppercase tracking-[0.16em] text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-line" /><span>or</span><span className="h-px flex-1 bg-line" />
          </div>

          <div ref={googleButtonRef} aria-label="Continue with Google" className="google-signin-slot mx-auto flex min-h-[60px] w-full max-w-[360px] justify-center overflow-visible px-1 py-1" />
          {!googleReady && <button type="button" disabled className="inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-lg border border-line bg-white px-4 py-2.5 text-base font-semibold text-ink opacity-65"><GoogleIcon size={20} /><span>Log in with Google</span></button>}
          <p className="mt-7 text-center text-sm text-muted">Don&apos;t have an account? <a href="#sign-up" onClick={staticLink} className="font-medium text-ink underline decoration-[#aeb5c2] underline-offset-4 hover:text-accent">Sign up</a></p>

          {/* Footer Context & Disclosures */}
          <footer className="mt-8 border-t border-line pt-5 text-center text-xs text-muted">
            <p>© {new Date().getFullYear()} NEMSU · InternMS</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <a href="#privacy" onClick={staticLink} className="text-accent hover:underline">Privacy Notice</a>
              <span aria-hidden="true" className="text-line">·</span>
              <a href="#terms" onClick={staticLink} className="text-accent hover:underline">Terms of Use</a>
            </div>
            <p className="mt-1">Main Campus · OJT Management System</p>
          </footer>
        </Card>
      </div>
    </main>
  );
}


