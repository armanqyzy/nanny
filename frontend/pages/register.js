import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { api, setSession } from '../lib/api';
import { useLanguage } from '../lib/i18n';

export default function Register() {
  const { t } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', password: '', role: 'owner',
  });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

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
    if (!form.full_name.trim()) nextErrors.full_name = 'Enter your full name.';
    if (!form.email.trim()) nextErrors.email = 'Enter your email address.';
    if (!form.password.trim()) nextErrors.password = 'Create a password.';
    else if (form.password.length < 8) nextErrors.password = 'Password should be at least 8 characters.';

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setErr('Please complete the highlighted fields.');
      return;
    }

    setErr(null);
    setBusy(true);
    setFieldErrors({});
    try {
      const res = await api.post('/api/auth/register', {
        ...form,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setSession(res);
      router.push(res.user.role === 'owner' ? '/dashboard?welcome=1' : '/dashboard');
    } catch (_e) {
      setErr('Could not create your account yet. Please review your details and try again.');
    }
    finally { setBusy(false); }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-73px)] bg-nanny-orange flex items-center justify-center px-6 py-12
                       bg-[radial-gradient(circle_at_20%_20%,#f9c846_1px,transparent_1px)] bg-[length:40px_40px]">
        <div className="card w-full max-w-md">
          <h1 className="text-2xl font-bold text-center text-nanny-blue mb-6">{t('auth', 'createAccount', 'CREATE AN ACCOUNT')}</h1>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <input className={`input ${fieldErrors.full_name ? 'border-red-300 ring-2 ring-red-100' : ''}`} placeholder={t('auth', 'fullName', 'Full name')}
                     value={form.full_name} onChange={(e) => {
                       setForm({ ...form, full_name: e.target.value });
                       clearFieldError('full_name');
                     }} />
              {fieldErrors.full_name && <p className="mt-2 text-sm text-red-600">{fieldErrors.full_name}</p>}
            </div>
            <div>
              <input className="input" placeholder={t('auth', 'phoneNumber', 'Phone number')}
                     value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <p className="mt-2 text-xs text-nanny-brownish/60">{t('auth', 'phoneHelp', 'Optional, but helpful for bookings and support.')}</p>
            </div>
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
              <p className={`mt-2 text-xs ${fieldErrors.password ? 'text-red-600' : 'text-nanny-brownish/60'}`}>
                {fieldErrors.password || t('auth', 'passwordHelp', 'Use at least 8 characters with letters and numbers.')}
              </p>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="role" value="owner"
                       checked={form.role === 'owner'} onChange={(e) => setForm({ ...form, role: e.target.value })} />
                {t('auth', 'ownerRole', 'I am a pet owner')}
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="role" value="sitter"
                       checked={form.role === 'sitter'} onChange={(e) => setForm({ ...form, role: e.target.value })} />
                {t('auth', 'sitterRole', 'I am a sitter')}
              </label>
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}
            <button disabled={busy} className="btn-primary w-full">
              {busy ? '…' : t('auth', 'signUp', 'Sign up')}
            </button>
            <p className="text-sm text-center">
              {t('auth', 'alreadyHave', 'Already have an account?')}{' '}
              <Link href="/login" className="text-nanny-blue font-semibold">{t('shell', 'signIn', 'Sign in')}</Link>
            </p>
          </form>
        </div>
      </main>
    </>
  );
}
