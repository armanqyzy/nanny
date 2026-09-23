import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { api, setSession } from '../lib/api';
import { useLanguage } from '../lib/i18n';

export default function Login() {
  const { t } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const nextPath = typeof router.query.next === 'string' && router.query.next.startsWith('/')
    ? router.query.next
    : null;

  function clearFieldError(name) {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = 'Enter your email address.';
    if (!form.password.trim()) nextErrors.password = 'Enter your password.';
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setErr('Please complete the highlighted fields.');
      return;
    }

    setErr(null);
    setBusy(true);
    setFieldErrors({});
    try {
      const res = await api.post('/api/auth/login', { email: form.email.trim(), password: form.password });
      setSession(res);
      router.push(nextPath || (res.user.role === 'admin' ? '/admin' : '/dashboard'));
    } catch (_e) {
      setErr('Could not sign you in. Check your email and password, then try again.');
    }
    finally { setBusy(false); }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-73px)] bg-nanny-orange flex items-center justify-center px-6 py-12
                        bg-[radial-gradient(circle_at_20%_20%,#f9c846_1px,transparent_1px)] bg-[length:40px_40px]">
        <div className="card w-full max-w-md">
          <h1 className="text-2xl font-bold text-center text-nanny-blue mb-6">{t('auth', 'signInTitle', 'SIGN IN')}</h1>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <input className={`input ${fieldErrors.email ? 'border-red-300 ring-2 ring-red-100' : ''}`} type="email" placeholder={t('auth', 'email', 'Email')}
                     value={form.email} onChange={(e) => {
                       setForm({ ...form, email: e.target.value });
                       clearFieldError('email');
                     }} />
              {fieldErrors.email && <p className="mt-2 text-sm text-red-600">{fieldErrors.email}</p>}
            </div>
            <div>
              <input className={`input ${fieldErrors.password ? 'border-red-300 ring-2 ring-red-100' : ''}`} type="password" placeholder={t('auth', 'password', 'Password')}
                     value={form.password} onChange={(e) => {
                       setForm({ ...form, password: e.target.value });
                       clearFieldError('password');
                     }} />
              {fieldErrors.password && <p className="mt-2 text-sm text-red-600">{fieldErrors.password}</p>}
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button disabled={busy} className="btn-primary w-full">
              {busy ? '…' : t('shell', 'signIn', 'Sign in')}
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-sm font-semibold text-nanny-blue">
              {t('auth', 'forgotPassword', 'Forgot password?')}
            </Link>
          </div>
          <p className="text-sm text-center mt-4">
            {t('auth', 'noAccount', 'No account?')} <Link href="/register" className="text-nanny-blue font-semibold">{t('auth', 'createOne', 'Create one')}</Link>
          </p>
        </div>
      </main>
    </>
  );
}
