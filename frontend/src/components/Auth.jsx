import { useEffect, useId, useRef, useState } from 'react';
import { Button, Card, Notice } from './ui.jsx';
import { Field, Input } from './workflow.jsx';
import { GoogleIcon, Icon } from './Icons.jsx';

export function AuthScreen({ onLogin, onGoogleSignIn, busy, error }) {
  const [googleReady, setGoogleReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginType, setLoginType] = useState('supervisor');
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
    script.onload = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: response => onGoogleSignIn?.(response.credential) });
      setGoogleReady(true);
    };
    script.onerror = () => setGoogleReady(false);
    document.head.appendChild(script);
    return () => script.remove();
  }, [onGoogleSignIn]);

  useEffect(() => {
    if (!googleReady || loginType !== 'university') return undefined;
    const container = googleButtonRef.current;
    if (!container || !window.google?.accounts?.id) return undefined;
    const renderGoogleButton = () => {
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
    renderGoogleButton();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const resizeObserver = new ResizeObserver(renderGoogleButton);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [googleReady, loginType]);

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

      <div className="auth-enter w-full max-w-[29rem]">
        <Card id="auth-card" className="rounded-2xl border-[#e3e6ee] bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.09)] sm:p-9">
          <header className="text-center">
            <img src="/internms-logo.svg" alt="" width="48" height="48" className="mx-auto h-12 w-12" />
            <h4 className="mt-1 text-xl font-bold tracking-wide text-ink">InternMS</h4>
            <p className="mt-1 text-xs font-semibold text-muted">North Eastern Mindanao State University</p>
            <h1 className="mt-2 text-[1.75rem] font-bold tracking-[-0.03em] text-ink">Log in to your account</h1>
            <p className="mt-2 text-sm text-muted">Choose how you access InternMS.</p>
          </header>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-subtle p-1" role="group" aria-label="Choose account type">
            <button type="button" aria-pressed={loginType === 'supervisor'} onClick={() => setLoginType('supervisor')} className={`min-h-[44px] rounded-lg px-3 text-sm font-semibold ${loginType === 'supervisor' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>Supervisor</button>
            <button type="button" aria-pressed={loginType === 'university'} onClick={() => setLoginType('university')} className={`min-h-[44px] rounded-lg px-3 text-sm font-semibold ${loginType === 'university' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>University</button>
          </div>

          {error && <Notice tone="danger" title="Authentication error"><span>{error}</span></Notice>}

          {loginType === 'supervisor' ? <>
            <p className="mt-4 text-sm text-muted">Host company supervisors sign in with the email and password provided for their account.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
              <Field id={emailId} label="Email address">
                <Input id={emailId} type="email" value={form.email} onChange={setField('email')} autoComplete="username" placeholder="user@example.com" required className="min-h-[52px] rounded-lg px-4 text-base" />
              </Field>

              <Field id={passwordId} label="Password">
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
                Log in as supervisor
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted">Have a supervisor invitation? <a href="#/supervisor-register" className="font-semibold text-ink underline decoration-[#aeb5c2] underline-offset-4 hover:text-accent">Create your account</a></p>
          </> : <section className="mt-5" aria-label="University sign-in">
            <p className="mb-4 text-sm text-muted">Students, coordinators, and administrators sign in with their NEMSU Google Workspace account.</p>
            <div ref={googleButtonRef} aria-label="Continue with Google" className="google-signin-slot mx-auto flex min-h-[60px] w-full max-w-[360px] justify-center overflow-visible px-1 py-1" />
            {!googleReady && <button type="button" disabled className="inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-lg border border-line bg-white px-4 py-2.5 text-base font-semibold text-ink opacity-65"><GoogleIcon size={20} /><span>Log in with Google</span></button>}
            <p className="mt-6 text-center text-sm text-muted">University accounts are provisioned automatically at sign-in. <a href="#/register" className="font-semibold text-ink underline decoration-[#aeb5c2] underline-offset-4 hover:text-accent">Learn more</a></p>
          </section>}

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


