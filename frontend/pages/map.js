import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/DashboardLayout';
import SittersMapExplorer from '../components/SittersMapExplorer';
import { currentUser } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { buildSitterRouteQuery, parseMapStateFromQuery } from '../lib/sitterMapState';

export default function SittersMapPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const lastSyncedQueryRef = useRef('');
  const [ready, setReady] = useState(false);
  const [filters, setFilters] = useState({
    city: '',
    service: '',
    max_price: '',
    q: '',
    min_rating: 4,
  });
  const [mapState, setMapState] = useState(parseMapStateFromQuery({}));
  const hasExplicitCenter = typeof router.query.lat === 'string' && typeof router.query.lng === 'string';

  useEffect(() => {
    if (!router.isReady) return;
    if (!currentUser()) {
      router.replace({
        pathname: '/login',
        query: { next: router.asPath || '/map' },
      });
      return;
    }
    const parsedMapState = parseMapStateFromQuery(router.query);
    const parsedMinRating = Number(router.query.min_rating);
    setFilters({
      city: typeof router.query.city === 'string' ? router.query.city : '',
      service: typeof router.query.service === 'string' ? router.query.service : '',
      max_price: typeof router.query.max_price === 'string' ? router.query.max_price : '',
      q: typeof router.query.q === 'string' ? router.query.q : '',
      min_rating: Number.isFinite(parsedMinRating) && parsedMinRating > 0 ? parsedMinRating : 4,
    });
    setMapState(parsedMapState);
    lastSyncedQueryRef.current = new URLSearchParams(
      buildSitterRouteQuery(
        {
          city: typeof router.query.city === 'string' ? router.query.city : '',
          service: typeof router.query.service === 'string' ? router.query.service : '',
          max_price: typeof router.query.max_price === 'string' ? router.query.max_price : '',
          q: typeof router.query.q === 'string' ? router.query.q : '',
          min_rating: Number.isFinite(parsedMinRating) && parsedMinRating > 0 ? parsedMinRating : 4,
        },
        parsedMapState
      )
    ).toString();
    setReady(true);
  }, [router.isReady, router.query]);

  const sharedQuery = useMemo(
    () => buildSitterRouteQuery(filters, mapState),
    [filters, mapState]
  );

  useEffect(() => {
    if (!ready || !router.isReady) return;
    const serialized = new URLSearchParams(sharedQuery).toString();
    if (serialized === lastSyncedQueryRef.current) return;
    lastSyncedQueryRef.current = serialized;
    router.replace({ pathname: '/map', query: sharedQuery }, undefined, { shallow: true });
  }, [ready, router, router.isReady, sharedQuery]);

  const t = {
    en: {
      pageTitle: 'Map search',
      title: 'Find sitters on the map',
      subtitle: 'Browse nearby sitters by distance and rating, then open a profile directly from the map.',
      minRating: 'Minimum rating',
    },
    ru: {
      pageTitle: 'Поиск на карте',
      title: 'Найдите ситтеров на карте',
      subtitle: 'Смотрите ближайших ситтеров по расстоянию и рейтингу, а затем открывайте профиль прямо с карты.',
      minRating: 'Минимальный рейтинг',
    },
    kz: {
      pageTitle: 'Картадан іздеу',
      title: 'Картадан ситтер табыңыз',
      subtitle: 'Жақын ситтерлерді қашықтық пен рейтинг бойынша қарап, профильді картадан тікелей ашыңыз.',
      minRating: 'Ең төменгі рейтинг',
    },
  }[language] || {};

  if (!ready) return null;

  return (
    <DashboardLayout title={t.pageTitle || 'Map search'}>
      <SittersMapExplorer
        filters={filters}
        center={mapState.center}
        onCenterChange={(nextCenter) => setMapState((prev) => ({ ...prev, center: nextCenter }))}
        maxDistance={mapState.maxDistance}
        onMaxDistanceChange={(nextDistance) => setMapState((prev) => ({ ...prev, maxDistance: nextDistance }))}
        sort={mapState.sort}
        onSortChange={(nextSort) => setMapState((prev) => ({ ...prev, sort: nextSort }))}
        listHref={{ pathname: '/sitters', query: sharedQuery }}
        title={t.title || 'Find sitters on the map'}
        subtitle={t.subtitle || 'Browse nearby sitters by distance and rating, then open a profile directly from the map.'}
        autoLocateOnMount
        hasExplicitCenter={hasExplicitCenter}
        controlsSlot={(
          <label className="text-sm">
            <span className="mb-1 block font-semibold">{t.minRating || 'Minimum rating'}</span>
            <select
              className="input min-w-[160px]"
              value={filters.min_rating}
              onChange={(event) => setFilters((prev) => ({ ...prev, min_rating: Number(event.target.value) }))}
            >
              <option value={3}>3.0+</option>
              <option value={3.5}>3.5+</option>
              <option value={4}>4.0+</option>
              <option value={4.5}>4.5+</option>
            </select>
          </label>
        )}
      />
    </DashboardLayout>
  );
}
