import { useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { api } from '../lib/api';
import { useLanguage } from '../lib/i18n';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await api.post('/api/auth/forgot-password', { email: email.trim() });
      setMessage(response.message || t('auth', 'requestSent', 'If this email exists in Nanny, a reset link has been sent.'));
    } catch (_error) {
      setError('Could not send the reset link right now. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-73px)] bg-nanny-orange flex items-center justify-center px-6 py-12 bg-[radial-gradient(circle_at_20%_20%,#f9c846_1px,transparent_1px)] bg-[length:40px_40px]">
        <div className="card w-full max-w-md">
          <h1 className="mb-4 text-center text-2xl font-bold text-nanny-blue">{t('auth', 'forgotTitle', 'RESET YOUR PASSWORD')}</h1>
          <p className="mb-6 text-center text-sm text-nanny-brownish/75">{t('auth', 'forgotText', 'Enter your email and we will send you a password reset link.')}</p>
          <form onSubmit={submit} className="space-y-4">
            <input
              className={`input ${error ? 'border-red-300 ring-2 ring-red-100' : ''}`}
              type="email"
              placeholder={t('auth', 'email', 'Email')}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
              }}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-700">{message}</p>}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? '…' : t('auth', 'sendReset', 'Send reset link')}
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
