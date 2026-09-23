import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Icon from '../../components/Icon';
import SittersMapExplorer from '../../components/SittersMapExplorer';
import { api, currentUser } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';
import { buildSitterRouteQuery, parseMapStateFromQuery } from '../../lib/sitterMapState';

const INITIAL_FILTERS = {
  city: '',
  service: '',
  min_rating: '',
  max_price: '',
  q: '',
  verified_only: true,
};

export default function SittersList() {
  const { language } = useLanguage();
  const router = useRouter();
  const hasHydratedRef = useRef(false);
  const lastSyncedQueryRef = useRef('');
  const [sitters, setSitters] = useState([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [mapState, setMapState] = useState(parseMapStateFromQuery({}));
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [compareIds, setCompareIds] = useState([]);

  useEffect(() => { loadFavorites(); }, []);

  useEffect(() => {
    if (!router.isReady || hasHydratedRef.current) return;

    const parsedFilters = {
      city: typeof router.query.city === 'string' ? router.query.city : '',
      service: typeof router.query.service === 'string' ? router.query.service : '',
      min_rating: typeof router.query.min_rating === 'string' ? router.query.min_rating : '',
      max_price: typeof router.query.max_price === 'string' ? router.query.max_price : '',
      q: typeof router.query.q === 'string' ? router.query.q : '',
      verified_only: router.query.verified_only !== '0',
    };
    const parsedMapState = parseMapStateFromQuery(router.query);

    hasHydratedRef.current = true;
    setFilters(parsedFilters);
    setAppliedFilters(parsedFilters);
    setMapState(parsedMapState);
    lastSyncedQueryRef.current = new URLSearchParams(
      buildSitterRouteQuery(parsedFilters, parsedMapState)
    ).toString();
    load(parsedFilters);
  }, [router.isReady, router.query]);

  async function loadFavorites() {
    if (!currentUser()) return;
    const data = await api.get('/api/sitters/favorites').catch(() => []);
    setFavoriteIds(new Set(data.map((item) => item.id)));
  }

  async function load(nextFilters = filters) {
    setLoading(true);
    const qs = new URLSearchParams(Object.fromEntries(
      Object.entries(nextFilters).filter(([, v]) => v !== '' && v !== false)
    )).toString();
    const data = await api.get('/api/sitters' + (qs ? '?' + qs : ''));
    setSitters(data);
    setAppliedFilters({ ...nextFilters });
    setLoading(false);
  }

  const sharedQuery = useMemo(
    () => buildSitterRouteQuery(appliedFilters, mapState),
    [appliedFilters, mapState]
  );

  useEffect(() => {
    if (!hasHydratedRef.current || !router.isReady) return;
    const serialized = new URLSearchParams(sharedQuery).toString();
    if (serialized === lastSyncedQueryRef.current) return;
    lastSyncedQueryRef.current = serialized;
    router.replace({ pathname: '/sitters', query: sharedQuery }, undefined, { shallow: true });
  }, [router, router.isReady, sharedQuery]);

  async function toggleFavorite(event, sitterId, isFavorite) {
    event.preventDefault();
    event.stopPropagation();
    if (!currentUser()) return;

    if (isFavorite) {
      await api.delete(`/api/sitters/${sitterId}/favorite`);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(sitterId);
        return next;
      });
      return;
    }

    await api.post(`/api/sitters/${sitterId}/favorite`, {});
    setFavoriteIds((prev) => new Set([...prev, sitterId]));
  }

  function toggleCompare(event, sitterId) {
    event.preventDefault();
    event.stopPropagation();
    setCompareIds((prev) => {
      if (prev.includes(sitterId)) return prev.filter((id) => id !== sitterId);
      if (prev.length >= 3) return [...prev.slice(1), sitterId];
      return [...prev, sitterId];
    });
  }

  const compareSitters = sitters.filter((sitter) => compareIds.includes(sitter.id));
  const copy = {
    en: {
      title: 'Find a pet sitter',
      subtitle: 'Compare services, reviews, verification and prices before booking.',
      searchByName: 'Search by name',
      city: 'City',
      anyService: 'Any service',
      walking: 'Walking',
      boarding: 'Boarding',
      homeVisit: 'Home visit',
      grooming: 'Grooming',
      minRating: 'Min rating',
      maxPrice: 'Max price/day',
      verifiedOnly: 'Verified sitters only',
      search: 'Search',
      compareEyebrow: 'Compare sitters',
      compareTitle: 'See the best fit side by side',
      clearCompare: 'Clear compare',
      rating: 'Rating:',
      experience: 'Experience:',
      price: 'Price:',
      zone: 'Zone:',
      openProfile: 'Open profile',
      loading: 'Loading…',
      verified: 'Verified',
      saveSitter: 'Save sitter',
      zoneShort: 'Zone:',
      hours: 'Hours:',
      expShort: 'y exp',
      viewProfile: 'View profile',
      addedToCompare: 'Added to compare',
      compare: 'Compare',
      noResults: 'No sitters match your filters.',
      mapTitle: 'See sitters on the map',
      mapSubtitle: 'Open nearby verified sitters on an interactive map and switch from cards to location-based browsing.',
      openFullMap: 'Open full map',
    },
    ru: {
      title: 'Найти пет-ситтера',
      subtitle: 'Сравнивайте услуги, отзывы, верификацию и цены до бронирования.',
      searchByName: 'Поиск по имени',
      city: 'Город',
      anyService: 'Любая услуга',
      walking: 'Прогулка',
      boarding: 'Передержка',
      homeVisit: 'Домашний визит',
      grooming: 'Груминг',
      minRating: 'Мин. рейтинг',
      maxPrice: 'Макс. цена/день',
      verifiedOnly: 'Только верифицированные ситтеры',
      search: 'Искать',
      compareEyebrow: 'Сравнение ситтеров',
      compareTitle: 'Посмотрите лучших кандидатов рядом друг с другом',
      clearCompare: 'Очистить сравнение',
      rating: 'Рейтинг:',
      experience: 'Опыт:',
      price: 'Цена:',
      zone: 'Зона:',
      openProfile: 'Открыть профиль',
      loading: 'Загрузка…',
      verified: 'Проверен',
      saveSitter: 'Сохранить ситтера',
      zoneShort: 'Зона:',
      hours: 'Часы:',
      expShort: 'лет опыта',
      viewProfile: 'Смотреть профиль',
      addedToCompare: 'Добавлено к сравнению',
      compare: 'Сравнить',
      noResults: 'По этим фильтрам ситтеры не найдены.',
      mapTitle: 'Посмотреть ситтеров на карте',
      mapSubtitle: 'Откройте ближайших проверенных ситтеров на интерактивной карте и переключайтесь с карточек на поиск по локации.',
      openFullMap: 'Открыть полную карту',
    },
    kz: {
      title: 'Pet sitter табу',
      subtitle: 'Бронь жасамас бұрын қызметтерді, пікірлерді, тексеруді және бағаларды салыстырыңыз.',
      searchByName: 'Аты бойынша іздеу',
      city: 'Қала',
      anyService: 'Кез келген қызмет',
      walking: 'Серуен',
      boarding: 'Уақытша күту',
      homeVisit: 'Үйге бару',
      grooming: 'Груминг',
      minRating: 'Мин. рейтинг',
      maxPrice: 'Макс. баға/күн',
      verifiedOnly: 'Тек тексерілген ситтерлер',
      search: 'Іздеу',
      compareEyebrow: 'Ситтерлерді салыстыру',
      compareTitle: 'Ең лайықты нұсқаларды қатар қарап шығыңыз',
      clearCompare: 'Салыстыруды тазалау',
      rating: 'Рейтинг:',
      experience: 'Тәжірибе:',
      price: 'Баға:',
      zone: 'Аймақ:',
      openProfile: 'Профильді ашу',
      loading: 'Жүктелуде…',
      verified: 'Тексерілген',
      saveSitter: 'Ситтерді сақтау',
      zoneShort: 'Аймақ:',
      hours: 'Сағаттар:',
      expShort: 'жыл тәжірибе',
      viewProfile: 'Профильді көру',
      addedToCompare: 'Салыстыруға қосылды',
      compare: 'Салыстыру',
      noResults: 'Бұл сүзгілерге сай ситтер табылмады.',
      mapTitle: 'Ситтерлерді картадан көру',
      mapSubtitle: 'Жақын тексерілген ситтерлерді интерактивті картадан ашып, карточкалардан локация бойынша іздеуге ауысыңыз.',
      openFullMap: 'Толық картаны ашу',
    },
  }[language] || {
    title: 'Find a pet sitter',
    subtitle: 'Compare services, reviews, verification and prices before booking.',
    searchByName: 'Search by name',
    city: 'City',
    anyService: 'Any service',
    walking: 'Walking',
    boarding: 'Boarding',
    homeVisit: 'Home visit',
    grooming: 'Grooming',
    minRating: 'Min rating',
    maxPrice: 'Max price/day',
    verifiedOnly: 'Verified sitters only',
    search: 'Search',
    compareEyebrow: 'Compare sitters',
    compareTitle: 'See the best fit side by side',
    clearCompare: 'Clear compare',
    rating: 'Rating:',
    experience: 'Experience:',
    price: 'Price:',
    zone: 'Zone:',
    openProfile: 'Open profile',
    loading: 'Loading…',
    verified: 'Verified',
    saveSitter: 'Save sitter',
    zoneShort: 'Zone:',
    hours: 'Hours:',
    expShort: 'y exp',
    viewProfile: 'View profile',
    addedToCompare: 'Added to compare',
    compare: 'Compare',
    noResults: 'No sitters match your filters.',
    mapTitle: 'See sitters on the map',
    mapSubtitle: 'Open nearby verified sitters on an interactive map and switch from cards to location-based browsing.',
    openFullMap: 'Open full map',
  };

  const mapFilters = {
    city: appliedFilters.city,
    service: appliedFilters.service,
    min_rating: appliedFilters.min_rating,
    max_price: appliedFilters.max_price,
    q: appliedFilters.q,
  };

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-nanny-blue">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm opacity-70">{copy.subtitle}</p>

        <form onSubmit={(e) => { e.preventDefault(); load({ ...filters }); }}
              className="mt-6 card grid md:grid-cols-5 gap-3">
          <input className="input" placeholder={copy.searchByName}
                 value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          <input className="input" placeholder={copy.city}
                 value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
          <select className="input" value={filters.service}
                  onChange={(e) => setFilters({ ...filters, service: e.target.value })}>
            <option value="">{copy.anyService}</option>
            <option value="walking">{copy.walking}</option>
            <option value="boarding">{copy.boarding}</option>
            <option value="home_visit">{copy.homeVisit}</option>
            <option value="grooming">{copy.grooming}</option>
          </select>
          <input className="input" type="number" step="0.1" placeholder={copy.minRating}
                 value={filters.min_rating}
                 onChange={(e) => setFilters({ ...filters, min_rating: e.target.value })} />
          <input className="input" type="number" placeholder={copy.maxPrice}
                 value={filters.max_price}
                 onChange={(e) => setFilters({ ...filters, max_price: e.target.value })} />
          <label className="input flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={filters.verified_only}
              onChange={(e) => setFilters({ ...filters, verified_only: e.target.checked })}
            />
            <span className="text-sm">{copy.verifiedOnly}</span>
          </label>
          <button className="btn-primary md:col-span-5">{copy.search}</button>
        </form>

        <div className="mt-6">
          <SittersMapExplorer
            filters={mapFilters}
            center={mapState.center}
            onCenterChange={(nextCenter) => setMapState((prev) => ({ ...prev, center: nextCenter }))}
            maxDistance={mapState.maxDistance}
            onMaxDistanceChange={(nextDistance) => setMapState((prev) => ({ ...prev, maxDistance: nextDistance }))}
            sort={mapState.sort}
            onSortChange={(nextSort) => setMapState((prev) => ({ ...prev, sort: nextSort }))}
            title={copy.mapTitle}
            subtitle={copy.mapSubtitle}
            controlsSlot={<Link href={{ pathname: '/map', query: sharedQuery }} className="btn-secondary self-end">{copy.openFullMap}</Link>}
          />
        </div>

        {compareSitters.length > 0 && (
          <section className="mt-6 rounded-[28px] border border-nanny-orange/15 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] opacity-55">{copy.compareEyebrow}</p>
                <h2 className="mt-2 text-xl font-bold text-nanny-deepOrange">{copy.compareTitle}</h2>
              </div>
              <button type="button" onClick={() => setCompareIds([])} className="btn-ghost text-sm">{copy.clearCompare}</button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {compareSitters.map((sitter) => (
                <article key={sitter.id} className="rounded-2xl border border-nanny-orange/15 bg-nanny-cream/35 p-4">
                  <div className="flex items-center gap-3">
                    <img src={sitter.avatar_url || 'https://placedog.net/120/120'} alt={sitter.full_name} className="h-14 w-14 rounded-full object-cover" />
                    <div>
                      <p className="font-bold">{sitter.full_name}</p>
                      <p className="text-xs opacity-70">{sitter.city}, {sitter.district}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <p><span className="font-semibold">{copy.rating}</span> {Number(sitter.rating).toFixed(1)}</p>
                    <p><span className="font-semibold">{copy.experience}</span> {sitter.experience_yrs}y</p>
                    <p><span className="font-semibold">{copy.price}</span> {Number(sitter.price_per_day).toLocaleString()} ₸/day</p>
                    <p><span className="font-semibold">{copy.zone}</span> {sitter.service_area_text || 'Almaty'}</p>
                  </div>
                  <Link href={`/sitters/${sitter.id}`} className="btn-secondary mt-4 inline-flex text-sm">{copy.openProfile}</Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <p className="mt-10 text-center">{copy.loading}</p>
        ) : (
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sitters.map((s) => (
              <Link key={s.id} href={`/sitters/${s.id}`} className="card surface-soft">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                  <img src={s.avatar_url || 'https://placedog.net/120/120'} alt={s.full_name}
                       className="w-16 h-16 rounded-full object-cover" />
                  <div>
                    <div className="font-bold">{s.full_name}</div>
                    <div className="text-xs opacity-70">{s.city}, {s.district}</div>
                    {s.is_verified && <span className="badge bg-green-100 text-green-700 mt-1">✓ {copy.verified}</span>}
                  </div>
                  </div>
                  {currentUser()?.role === 'owner' && (
                    <button
                      type="button"
                      onClick={(event) => toggleFavorite(event, s.id, favoriteIds.has(s.id) || s.is_favorite)}
                      className={`rounded-full p-2 ${favoriteIds.has(s.id) || s.is_favorite ? 'bg-red-50 text-red-500' : 'bg-nanny-cream text-nanny-brownish/55'}`}
                      aria-label={copy.saveSitter}
                    >
                      <Icon name="heart" className="h-5 w-5" solid={favoriteIds.has(s.id) || s.is_favorite} />
                    </button>
                  )}
                </div>
                <p className="text-sm mt-3 line-clamp-2">{s.description}</p>
                {(s.service_area_text || s.work_start || s.work_end) && (
                  <div className="mt-3 space-y-1 text-xs opacity-70">
                    {s.service_area_text && <p>{copy.zoneShort} {s.service_area_text}</p>}
                    {(s.work_start || s.work_end) && (
                      <p>
                        {copy.hours} {s.work_start ? String(s.work_start).slice(0, 5) : '00:00'} - {s.work_end ? String(s.work_end).slice(0, 5) : '23:59'}
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-bold text-nanny-orange">⭐ {Number(s.rating).toFixed(1)}</span>
                  <span className="opacity-70">{s.experience_yrs} {copy.expShort}</span>
                  <span className="font-bold">{Number(s.price_per_day).toLocaleString()} ₸/day</span>
                </div>
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="btn-ghost text-sm inline-flex">{copy.viewProfile}</span>
                    {currentUser()?.role === 'owner' && (
                      <button type="button" onClick={(event) => toggleCompare(event, s.id)} className={`btn text-sm ${compareIds.includes(s.id) ? 'btn-secondary' : 'btn-ghost'}`}>
                        {compareIds.includes(s.id) ? copy.addedToCompare : copy.compare}
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {sitters.length === 0 && (
              <p className="col-span-full text-center opacity-70">{copy.noResults}</p>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
