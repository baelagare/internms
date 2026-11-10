import { useState } from 'react';
import { Icon } from './Icons.jsx';



export function AuthScreen({ onLogin, onRegister, onSupervisorOnboard, busy, error }) {
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ identifier: '', password: '', name: '', email: '', inviteToken: '' });
  const set = key => event => setForm(previous => ({ ...previous, [key]: event.target.value }));
  const selectMode = next => { setMode(next); setShowPassword(false); };
  function submit(event) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    if (mode === 'login') onLogin(form.identifier.trim(), form.password);
    else onSupervisorOnboard({ ...form, name: form.name.trim(), email: form.email.trim(), inviteToken: form.inviteToken.trim() });
  }
  return <main className="auth-page">
    <a href="#auth-form" className="auth-skip">Skip to sign in</a>
    <div className="auth-layout">
      <section className="auth-story" aria-label="About InternMS"><div className="auth-story-grid" aria-hidden="true" /><div className="auth-story-inner">
        <Brand light />
        <div className="auth-story-copy"><div className="auth-kicker"><span /> OJT management, made visible</div><h1>From first placement to final evaluation.</h1><p>One centralized workspace for managing student placements, OJT requirements, progress monitoring, and final evaluations.</p><div className="auth-role-list"><span><i>01</i> Student Interns</span><span><i>02</i> OJT Coordinators</span><span><i>03</i> Partner Supervisors</span><span><i>04</i> System Administrators</span></div></div>
      </div></section>
      <section className="auth-entry" aria-label="InternMS account access">
        <div className="auth-entry-top"><div className="auth-mobile-brand"><Brand /></div><p>New student? <a href="#/register" onClick={onRegister}>Create an account</a></p></div>
        <div className="auth-card-wrap"><div className="auth-card">
          <div className="auth-card-heading"><p className="auth-eyebrow">NEMSU Main Campus</p><h2>{mode === 'login' ? 'Sign in to InternMS' : 'Partner access'}</h2><p>{mode === 'login' ? 'Continue where your OJT journey left off.' : 'Use your organization invitation to access InternMS.'}</p></div>
          <div className="auth-tabs" role="tablist" aria-label="Authentication options"><button type="button" role="tab" aria-selected={mode === 'login'} aria-controls="auth-form" onClick={() => selectMode('login')}>Sign in</button><button type="button" role="tab" aria-selected={mode === 'supervisor'} aria-controls="auth-form" onClick={() => selectMode('supervisor')}>Partner access</button></div>
          {error && <div className="auth-alert" role="alert"><Icon name="alert" size={17} /><span>{error}</span></div>}
          <form id="auth-form" className="auth-form" onSubmit={submit} noValidate>
            {mode === 'login' ? <>
              <Field id="login-identifier" label="Account identifier" hint="Enter your student ID, username, or staff code" value={form.identifier} onChange={set('identifier')} autoComplete="username" autoFocus required />
              <div className="auth-password-field"><Field id="login-password" label="Password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete="current-password" required /><button type="button" className="auth-password-toggle" aria-pressed={showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button></div>
              <div className="auth-form-meta"><span className="auth-secure-note"><Icon name="lock" size={14} /> Secure campus access</span><a className="auth-text-button" href="mailto:ojt@nemsu.edu.ph?subject=InternMS%20account%20access%20support">Need help signing in?</a></div>
              <button className="auth-submit" type="submit" disabled={busy}>{busy ? <><span className="auth-spinner" /> Signing in…</> : <>Sign in <Icon name="arrow" size={17} /></>}</button>
              
            </> : <><div className="auth-two-col"><Field id="partner-name" label="Your name" value={form.name} onChange={set('name')} autoComplete="name" required /><Field id="partner-email" label="Work email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></div><Field id="partner-token" label="Invite token" hint="Ask your NEMSU coordinator for the partner invite token" value={form.inviteToken} onChange={set('inviteToken')} required /><button className="auth-submit" type="submit" disabled={busy}>{busy ? <><span className="auth-spinner" /> Setting up access…</> : <>Create partner access <Icon name="arrow" size={17} /></>}</button></>}
          </form><p className="auth-card-foot">Use InternMS only for authorized NEMSU OJT coordination.</p>
        </div>
        <div className="auth-entry-bottom">
          <div className="auth-support"><span className="auth-status-dot" /> Secure NEMSU account access <span className="auth-support-divider" /> Need assistance? <a href="mailto:ojt@nemsu.edu.ph">Contact OJT support</a></div>
          <footer className="auth-entry-footer"><span>© {new Date().getFullYear()} NEMSU · InternMS</span><nav aria-label="Legal"><a href="#privacy-notice">Privacy Notice</a><a href="#terms-of-use">Terms of Use</a><a href="mailto:ojt@nemsu.edu.ph">Contact Support</a></nav></footer><details id="privacy-notice" className="auth-legal-disclosure"><summary>Privacy Notice</summary><p>Privacy notice content is pending institutional approval and can be configured before production deployment.</p></details><details id="terms-of-use" className="auth-legal-disclosure"><summary>Terms of Use</summary><p>Terms of use content is pending institutional approval and can be configured before production deployment.</p></details>
        </div>
        </div>
      </section>
    </div>
  </main>;
}
function Brand({ light = false }) { return <div className={`auth-brand ${light ? 'is-light' : ''}`}><img src="/internms-logo.svg" alt="InternMS logo" /><div><strong>InternMS</strong><span>NEMSU Main Campus</span></div></div>; }
function Field({ id, label, hint, type = 'text', ...props }) {
  const hintId = hint ? `${id}-hint` : undefined;
  return <label className="auth-field"><span className="auth-field-label">{label}</span>{hint && <span id={hintId} className="auth-field-hint">{hint}</span>}<input id={id} type={type} aria-describedby={props['aria-describedby'] || hintId} {...props} /></label>;
}

