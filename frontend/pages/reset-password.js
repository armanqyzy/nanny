import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { api } from '../lib/api';
import { useLanguage } from '../lib/i18n';

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const token = useMemo(() => (
    typeof router.query.token === 'string' ? router.query.token : ''
  ), [router.query.token]);

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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

  async function submit(event) {
    event.preventDefault();
    const nextErrors = {};

    if (!token) nextErrors.token = 'This reset link is missing or invalid.';
    if (!form.password.trim()) nextErrors.password = 'Enter a new password.';
    else if (form.password.length < 8) nextErrors.password = 'Password should be at least 8 characters.';
    if (!form.confirmPassword.trim()) nextErrors.confirmPassword = 'Repeat the new password.';
    else if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError(nextErrors.token || 'Please complete the highlighted fields.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    setFieldErrors({});

    try {
      const response = await api.post('/api/auth/reset-password', {
        token,
        password: form.password,
      });
      setMessage(response.message || t('auth', 'resetDone', 'Password updated. You can now sign in.'));
      setTimeout(() => router.push('/login'), 1200);
    } catch (_err) {
      setError('Could not reset the password. The link may be expired or invalid.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-73px)] bg-nanny-orange flex items-center justify-center px-6 py-12 bg-[radial-gradient(circle_at_20%_20%,#f9c846_1px,transparent_1px)] bg-[length:40px_40px]">
        <div className="card w-full max-w-md">
          <h1 className="mb-4 text-center text-2xl font-bold text-nanny-blue">{t('auth', 'resetTitle', 'CHOOSE A NEW PASSWORD')}</h1>
          <p className="mb-6 text-center text-sm text-nanny-brownish/75">{t('auth', 'resetText', 'Create a new password for your account.')}</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <input
                className={`input ${fieldErrors.password ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                type="password"
                placeholder={t('auth', 'newPassword', 'New password')}
                value={form.password}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, password: event.target.value }));
                  clearFieldError('password');
                }}
              />
              {fieldErrors.password && <p className="mt-2 text-sm text-red-600">{fieldErrors.password}</p>}
            </div>
            <div>
              <input
                className={`input ${fieldErrors.confirmPassword ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                type="password"
                placeholder={t('auth', 'confirmPassword', 'Repeat new password')}
                value={form.confirmPassword}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, confirmPassword: event.target.value }));
                  clearFieldError('confirmPassword');
                }}
              />
              {fieldErrors.confirmPassword && <p className="mt-2 text-sm text-red-600">{fieldErrors.confirmPassword}</p>}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-700">{message}</p>}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? '…' : t('auth', 'resetPassword', 'Reset password')}
            </button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link href="/login" className="font-semibold text-nanny-blue">{t('auth', 'backToSignIn', 'Back to sign in')}</Link>
          </p>
        </div>
      </main>
    </>
  );
}
