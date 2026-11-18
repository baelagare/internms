import { useId, useState } from 'react';
import { Button, Card, Notice } from './ui.jsx';
import { Field, Input } from './workflow.jsx';

export function Registration({ onSupervisorRegister, busy = false, error = '', supervisor = false }) {
  const [form, setForm] = useState({ inviteToken: '', name: '', email: '', password: '' });
  const inviteTokenId = useId();
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  function handleReturn() {
    window.location.hash = '#/login';
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    onSupervisorRegister?.(form);
  }

  const setField = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  const title = supervisor ? 'Supervisor account setup' : 'Student Account Provisioning';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas p-4 sm:p-6" aria-label={supervisor ? 'Supervisor account setup' : 'Student account access'}>
      <div className="w-full max-w-auth space-y-6">
        <Card className="space-y-6 p-6 shadow-none sm:p-8">
          <div className="space-y-2 text-center">
            <img src="/internms-logo.svg" alt="" width="44" height="44" className="mx-auto h-11 w-11" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">InternMS</h1>
              <p className="text-xs font-semibold text-muted">North Eastern Mindanao State University</p>
              <p className="text-xs text-muted">Main Campus · {supervisor ? 'Host Company Access' : 'Student Access'}</p>
            </div>
          </div>

          {supervisor ? <>
            <div className="space-y-2 text-center">
              <h2 className="text-base font-semibold text-ink">{title}</h2>
              <p className="text-sm leading-relaxed text-muted">Use the one-time invitation token provided by your company or OJT coordinator to activate your supervisor account.</p>
            </div>
            {error && <Notice tone="danger" title="Account setup failed">{error}</Notice>}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Field id={inviteTokenId} label="Invitation token">
                <Input id={inviteTokenId} value={form.inviteToken} onChange={setField('inviteToken')} autoComplete="off" required className="min-h-[48px] rounded-lg px-4" />
              </Field>
              <Field id={nameId} label="Full name">
                <Input id={nameId} value={form.name} onChange={setField('name')} autoComplete="name" required className="min-h-[48px] rounded-lg px-4" />
              </Field>
              <Field id={emailId} label="Email address">
                <Input id={emailId} type="email" value={form.email} onChange={setField('email')} autoComplete="email" required className="min-h-[48px] rounded-lg px-4" />
              </Field>
              <Field id={passwordId} label="Create password" hint="Use at least 8 characters.">
                <Input id={passwordId} type="password" value={form.password} onChange={setField('password')} autoComplete="new-password" minLength={8} required className="min-h-[48px] rounded-lg px-4" />
              </Field>
              <Button type="submit" variant="primary" disabled={busy} loading={busy} loadingLabel="Creating account…" className="min-h-[50px] w-full">Create supervisor account</Button>
            </form>
          </> : <>
            <div className="space-y-3">
              <h2 className="text-center text-base font-semibold text-ink">{title}</h2>
              <p className="text-center text-sm leading-relaxed text-muted">Student accounts are authorized directly through institutional Google Workspace sign-in (<code className="font-mono text-ink">@nemsu.edu.ph</code>). Manual password registration is not required.</p>
            </div>
            <Notice tone="info" title="Automatic Account Setup">Sign in with your official university Google account (<code className="font-mono text-ink">@nemsu.edu.ph</code>) on the sign-in page. Upon initial sign-in, you will declare your college and degree program, which connects your workspace directly to your College OJT Coordinator.</Notice>
          </>}

          <Button variant={supervisor ? 'secondary' : 'primary'} onClick={handleReturn} className="w-full">Return to Sign-In</Button>
          <footer className="border-t border-line pt-4 text-center text-xs text-muted">
            <p>© {new Date().getFullYear()} NEMSU · InternMS</p>
            {!supervisor && <p className="mt-1 text-xs text-muted">Need assistance? Contact your College OJT Coordinator</p>}
          </footer>
        </Card>
      </div>
    </main>
  );
}
