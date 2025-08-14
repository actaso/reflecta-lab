"use client";
import { useCallback, useState } from 'react';

export default function BetaPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const TESTFLIGHT_LINK = 'https://testflight.apple.com/join/e8VycKPE';

  const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Submission failed');
      }
      await res.json().catch(() => ({}));
      setSuccessLink(TESTFLIGHT_LINK);
      setName('');
      setPhone('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }, [name, phone]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="space-y-8 text-center">
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">You’re invited.</h1>
            <p className="text-sm text-neutral-500">Get access to the private TestFlight now.</p>
          </div>

          {successLink ? (
            <div className="rounded-xl border border-neutral-200 p-6 shadow-sm text-left space-y-3">
              <p className="text-sm">You’re in. Open TestFlight in a new tab below. Keep this page open to retain the link.</p>
              <div className="text-sm">
                {successLink && (
                  <a href={successLink} target="_blank" rel="noreferrer" className="text-black underline">Open TestFlight</a>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-neutral-200 p-6 shadow-sm">
              <div className="text-left space-y-1">
                <label htmlFor="name" className="text-sm font-medium">Full name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Founder"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
              <div className="text-left space-y-1">
                <label htmlFor="phone" className="text-sm font-medium">Phone number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 123 4567"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/5"
                />
                <p className="text-xs text-neutral-500">We’ll only use this to request feedback and improve the app.</p>
              </div>
              {error && <p className="text-left text-sm text-red-600">{error}</p>}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/90 disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Get TestFlight access'}
                </button>
              </div>
              <p className="text-xs text-neutral-500">Instant access link provided after submit. We may reach out for short feedback.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}


