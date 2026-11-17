import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { absoluteAssetUrl, api } from '../lib/api';
import { formatRating } from '../lib/rating';

const TEXT = {
  placeholder: { en: 'Search sitters, districts, products…', ru: 'Ситтер, район, услуга или товар…', kz: 'Ситтер, аудан, қызмет немесе тауар…' },
  sitters: { en: 'Sitters', ru: 'Ситтеры', kz: 'Ситтерлер' },
  products: { en: 'Shop', ru: 'Магазин', kz: 'Дүкен' },
  nothing: { en: 'Nothing found. Try a name, a district or “walk”.', ru: 'Ничего не нашли. Попробуйте имя, район или «прогулка».', kz: 'Ештеңе табылмады. Атын, ауданды немесе «серуен» деп көріңіз.' },
  all: { en: 'Show all sitters for this search', ru: 'Все ситтеры по запросу', kz: 'Сұрау бойынша барлық ситтерлер' },
  search: { en: 'Search', ru: 'Поиск', kz: 'Іздеу' },
};
const DISTRICT_RU = {
  Almaly: { ru: 'Алмалинский', kz: 'Алмалы' }, Auezov: { ru: 'Ауэзовский', kz: 'Әуезов' }, Bostandyk: { ru: 'Бостандыкский', kz: 'Бостандық' },
  Zhetysu: { ru: 'Жетысуский', kz: 'Жетісу' }, Medeu: { ru: 'Медеуский', kz: 'Медеу' }, Nauryzbay: { ru: 'Наурызбайский', kz: 'Наурызбай' },
  Turksib: { ru: 'Турксибский', kz: 'Түрксіб' }, Alatau: { ru: 'Алатауский', kz: 'Алатау' },
};

// Header search. variant="dropdown": icon button with a panel (desktop); "inline": a plain field (phone menu).
export default function HeaderSearch({ language = 'en', variant = 'dropdown' }) {
  const tx = (key) => TEXT[key][language] || TEXT[key].en;
  const router = useRouter();
  const [open, setOpen] = useState(variant === 'inline');
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setResults(null); return undefined; }
    const timer = setTimeout(() => {
      api.get(`/api/public/search?q=${encodeURIComponent(query)}`).then(setResults).catch(() => setResults({ sitters: [], products: [] }));
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (variant !== 'dropdown' || !open) return undefined;
    inputRef.current?.focus();
    const close = (event) => { if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); };
  }, [open, variant]);

  useEffect(() => { if (variant === 'dropdown') setOpen(false); setQ(''); }, [router.asPath, variant]);

  function submit(event) {
    event.preventDefault();
    if (q.trim().length < 2) return;
    router.push({ pathname: '/sitters', query: { q: q.trim() } });
  }

  const panel = (
    <div className={variant === 'dropdown'
      ? 'absolute right-0 mt-3 w-[min(420px,calc(100vw-2rem))] rounded-[24px] border border-nanny-orange/15 bg-white p-3 shadow-[0_24px_70px_rgba(122,75,31,0.18)]'
      : ''}
    >
      <form onSubmit={submit}>
        <input
          ref={inputRef}
          type="search"
          className="input"
          placeholder={tx('placeholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={tx('search')}
        />
      </form>
      {results && (
        <div className="mt-2 max-h-[60vh] overflow-y-auto">
          {!results.sitters.length && !results.products.length && <p className="px-2 py-3 text-sm opacity-70">{tx('nothing')}</p>}
          {results.sitters.length > 0 && (
            <>
              <p className="px-2 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-nanny-brownish/50">{tx('sitters')}</p>
              {results.sitters.map((s) => (
                <Link key={`s${s.id}`} href={`/sitters/${s.id}`} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-nanny-cream/60">
                  <img src={absoluteAssetUrl(s.avatar_url) || '/pet-placeholder.png'} alt="" className="h-9 w-9 rounded-full object-cover"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/pet-placeholder.png'; }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-nanny-brownish">{s.full_name}</span>
                    <span className="block text-xs opacity-60">
                      {(DISTRICT_RU[s.district]?.[language]) || s.district} · ⭐ {formatRating(s.rating, s.rating_count, language)} · {Number(s.price_per_day).toLocaleString()} ₸
                    </span>
                  </span>
                </Link>
              ))}
              <button type="button" onClick={submit} className="mt-1 w-full rounded-2xl px-2 py-2 text-left text-sm font-semibold text-nanny-blue hover:bg-nanny-cream/60">
                {tx('all')} →
              </button>
            </>
          )}
          {results.products.length > 0 && (
            <>
              <p className="px-2 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-nanny-brownish/50">{tx('products')}</p>
              {results.products.map((p) => (
                <Link key={`p${p.id}`} href={`/shop/${p.id}`} className="flex items-center justify-between gap-3 rounded-2xl px-2 py-2 hover:bg-nanny-cream/60">
                  <span className="truncate text-sm text-nanny-brownish">{p.title}</span>
                  <span className="shrink-0 text-sm font-semibold">{Number(p.price).toLocaleString()} ₸</span>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );

  if (variant === 'inline') return panel;
  return (
    <div className="relative" ref={boxRef}>
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="btn-ghost px-3" aria-label={tx('search')} aria-expanded={open}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      </button>
      {open && panel}
    </div>
  );
}
