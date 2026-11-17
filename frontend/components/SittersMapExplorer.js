import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { absoluteAssetUrl, api } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { formatRating } from '../lib/rating';

const DEFAULT_CENTER = { lat: 43.238949, lng: 76.889709 };

// Approximate centers of Almaty districts, so people can search an area without clicking the map.
const ALMATY_DISTRICTS = [
  { key: 'almaly', en: 'Almaly', ru: 'Алмалинский', kz: 'Алмалы', lat: 43.2510, lng: 76.9050 },
  { key: 'auezov', en: 'Auezov', ru: 'Ауэзовский', kz: 'Әуезов', lat: 43.2290, lng: 76.8350 },
  { key: 'bostandyk', en: 'Bostandyk', ru: 'Бостандыкский', kz: 'Бостандық', lat: 43.2140, lng: 76.9100 },
  { key: 'zhetysu', en: 'Zhetysu', ru: 'Жетысуский', kz: 'Жетісу', lat: 43.2900, lng: 76.9300 },
  { key: 'medeu', en: 'Medeu', ru: 'Медеуский', kz: 'Медеу', lat: 43.2400, lng: 76.9800 },
  { key: 'nauryzbay', en: 'Nauryzbay', ru: 'Наурызбайский', kz: 'Наурызбай', lat: 43.2000, lng: 76.7900 },
  { key: 'turksib', en: 'Turksib', ru: 'Турксибский', kz: 'Түрксіб', lat: 43.3400, lng: 76.9600 },
  { key: 'alatau', en: 'Alatau', ru: 'Алатауский', kz: 'Алатау', lat: 43.2650, lng: 76.7900 },
];
const DEFAULT_SORT = 'nearest';
const MAP_CENTER_STORAGE_KEY = 'nanny_map_center';

async function loadLeaflet() {
  if (typeof window === 'undefined') throw new Error('No window');
  const leafletModule = await import('leaflet');
  return leafletModule.default || leafletModule;
}

function buildQuery(filters, center, maxDistance, sort) {
  const params = new URLSearchParams({
    lat: String(center.lat),
    lng: String(center.lng),
    sort,
  });
  // 0 means "anywhere": no radius limit, every sitter is shown.
  if (Number(maxDistance) > 0) params.set('max_distance', String(maxDistance));

  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value === '' || value == null || value === false) return;
    params.set(key, String(value));
  });

  return params.toString();
}

function sitterAddress(sitter, fallback) {
  const parts = [sitter.city, sitter.district].filter(Boolean);
  return parts.length ? parts.join(', ') : fallback;
}

function isFiniteCoordinate(value) {
  return Number.isFinite(Number(value));
}

function normalizeCenter(center) {
  if (!center || !isFiniteCoordinate(center.lat) || !isFiniteCoordinate(center.lng)) return null;
  return {
    lat: Number(Number(center.lat).toFixed(6)),
    lng: Number(Number(center.lng).toFixed(6)),
  };
}

function centersMatch(a, b) {
  if (!a || !b) return false;
  return Math.abs(Number(a.lat) - Number(b.lat)) < 0.000001
    && Math.abs(Number(a.lng) - Number(b.lng)) < 0.000001;
}

function readSavedMapCenter() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(MAP_CENTER_STORAGE_KEY);
    if (!raw) return null;
    return normalizeCenter(JSON.parse(raw));
  } catch (_error) {
    return null;
  }
}

function saveMapCenter(center) {
  if (typeof window === 'undefined') return;

  const normalized = normalizeCenter(center);
  if (!normalized) return;

  try {
    window.localStorage.setItem(MAP_CENTER_STORAGE_KEY, JSON.stringify(normalized));
  } catch (_error) {
    // Ignore storage write failures in private windows or restrictive browsers.
  }
}

function fitMapSafely(map, bounds, center) {
  const container = map?.getContainer?.();
  const width = container?.clientWidth || 0;
  const height = container?.clientHeight || 0;

  if (!map || !bounds?.isValid?.() || width < 40 || height < 40) {
    map?.setView?.([center.lat, center.lng], 12);
    return;
  }

  try {
    map.fitBounds(bounds, { padding: [24, 24] });
  } catch (_error) {
    map.setView([center.lat, center.lng], 12);
  }
}

function isMapRenderable(map) {
  const container = map?.getContainer?.();
  const width = container?.clientWidth || 0;
  const height = container?.clientHeight || 0;
  return Boolean(map && width >= 40 && height >= 40);
}

function safeRemoveLayer(layer) {
  if (!layer) return;
  try {
    layer.remove();
  } catch (_error) {
    // Ignore teardown races from Leaflet when React unmounts during an update.
  }
}

function safeDestroyMap(map) {
  if (!map) return;

  try {
    map.off?.();
    map.remove?.();
  } catch (_error) {
    // Ignore Leaflet teardown races when Next.js removes the page mid-transition.
  }
}

export default function SittersMapExplorer({
  filters = {},
  title,
  subtitle,
  controlsSlot = null,
  center,
  onCenterChange,
  initialCenter = DEFAULT_CENTER,
  maxDistance,
  onMaxDistanceChange,
  initialMaxDistance = 15,
  sort,
  onSortChange,
  initialSort = DEFAULT_SORT,
  listHref = null,
  defaultMobileView = 'map',
  autoLocateOnMount = false,
  hasExplicitCenter = false,
}) {
  const { language } = useLanguage();
  const leafletRef = useRef(null);
  const mapNodeRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());
  const markersLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const searchRadiusRef = useRef(null);
  const selectedZoneRef = useRef(null);
  const tileLayerRef = useRef(null);
  const tileDiagnosticsTimerRef = useRef(null);
  const tileStateRef = useRef({ hadSuccessfulLoad: false, hadError: false });
  const textRef = useRef({});
  const autoLocateAttemptedRef = useRef(false);
  const restoredSavedCenterRef = useRef(false);
  const pickCenterRef = useRef(null);
  const [sitters, setSitters] = useState([]);
  const [stats, setStats] = useState({
    total_count: 0,
    with_location_count: 0,
    without_location_count: 0,
    in_radius_count: 0,
  });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapDiagnostics, setMapDiagnostics] = useState('');
  const [internalCenter, setInternalCenter] = useState(initialCenter);
  const [internalMaxDistance, setInternalMaxDistance] = useState(initialMaxDistance);
  const [internalSort, setInternalSort] = useState(initialSort);
  const [isLocating, setIsLocating] = useState(false);
  const [hasBrowserLocation, setHasBrowserLocation] = useState(false);
  const [mobileView, setMobileView] = useState(defaultMobileView);

  const activeCenter = center || internalCenter;
  const activeMaxDistance = maxDistance ?? internalMaxDistance;
  const activeSort = sort || internalSort;

  const t = {
    en: {
      unavailable: 'Interactive map is temporarily unavailable, but sitter results are shown below.',
      noMatch: 'No sitters with map coordinates match these filters yet.',
      noFilterMatch: 'No sitters match the current filters yet.',
      noRadiusMatch: (distance) => `No sitters were found within ${distance} km.`,
      noCoordinates: 'Matching sitters exist, but they have not filled in their map coordinates yet.',
      noCoordinatesSuffix: (count) => `${count} sitter profiles need location details to appear on the map.`,
      summary: (count, distance) => `${count} sitters shown on the map within ${distance} km`,
      distance: 'Distance',
      detectLocation: 'Use my location',
      locating: 'Detecting location...',
      selected: 'Selected sitter',
      selectedHint: 'Choose a marker or sitter card to view details.',
      caringBio: 'Caring sitter with verified profile and pet-friendly routine.',
      kmAway: 'km away',
      openProfile: 'Open sitter profile',
      loading: 'Loading sitters on the map...',
      rating: 'Rating',
      cityFallback: 'Almaty',
      locationReady: 'Map centered on your location.',
      pickHint: 'Tip: click anywhere on the map to search for sitters around that place.',
      pickedPlace: 'Search area moved to the selected place.',
      locationUnavailable: 'Browser geolocation is unavailable. The map stays centered on Almaty.',
      locationDenied: 'Location permission was blocked. The map stays centered on Almaty.',
      mapPin: 'Your search area',
      searchRadius: (distance) => `Search radius: ${distance} km`,
      serviceZone: (distance) => `Sitter service zone: ${distance} km`,
      pricePerDay: 'per day',
      verified: 'Verified',
      tilesUnavailable: 'Map tiles did not load. Check your connection and try again.',
      retryTiles: 'Retry map',
      sort: 'Sort',
      nearest: 'Nearest first',
      bestRating: 'Best rating',
      lowestPrice: 'Lowest price',
      showInList: 'Show same set in list',
      mapTab: 'Map',
      listTab: 'List',
      emptyTitle: 'Nothing to show on the map yet',
      serviceArea: 'Service area',
    },
    ru: {
      unavailable: 'Интерактивная карта временно недоступна, но результаты ситтеров показаны ниже.',
      noMatch: 'Ситтеры с координатами по этим фильтрам пока не найдены.',
      noFilterMatch: 'По текущим фильтрам ситтеры не найдены.',
      noRadiusMatch: (distance) => `В радиусе ${distance} км ситтеры не найдены.`,
      noCoordinates: 'Подходящие ситтеры есть, но они ещё не заполнили координаты профиля.',
      noCoordinatesSuffix: (count) => `${count} профилям ситтеров не хватает координат, чтобы появиться на карте.`,
      summary: (count, distance) => `На карте показано: ${count} ситтеров • до ${distance} км`,
      distance: 'Дистанция',
      detectLocation: 'Использовать мою геолокацию',
      locating: 'Определяем геолокацию...',
      selected: 'Выбранный ситтер',
      selectedHint: 'Выберите маркер или карточку ситтера, чтобы увидеть детали.',
      caringBio: 'Заботливый ситтер с проверенным профилем и комфортным режимом ухода.',
      kmAway: 'км от вас',
      openProfile: 'Открыть профиль ситтера',
      loading: 'Загружаем ситтеров на карте...',
      rating: 'Рейтинг',
      cityFallback: 'Алматы',
      locationReady: 'Карта центрирована по вашей геолокации.',
      pickHint: 'Подсказка: нажмите на любое место на карте, чтобы искать ситтеров рядом с ним.',
      pickedPlace: 'Область поиска перенесена в выбранное место.',
      locationUnavailable: 'Геолокация в браузере недоступна. Карта останется на Алматы.',
      locationDenied: 'Доступ к геолокации запрещен. Карта останется на Алматы.',
      mapPin: 'Район поиска',
      searchRadius: (distance) => `Радиус поиска: ${distance} км`,
      serviceZone: (distance) => `Рабочая зона ситтера: ${distance} км`,
      pricePerDay: 'в день',
      verified: 'Проверен',
      tilesUnavailable: 'Тайлы карты не загрузились. Проверьте соединение и попробуйте снова.',
      retryTiles: 'Повторить загрузку карты',
      sort: 'Сортировка',
      nearest: 'Сначала ближние',
      bestRating: 'Лучший рейтинг',
      lowestPrice: 'Низкая цена',
      showInList: 'Показать этот же набор в списке',
      mapTab: 'Карта',
      listTab: 'Список',
      emptyTitle: 'На карте пока нечего показать',
      serviceArea: 'Зона работы',
    },
    kz: {
      unavailable: 'Интерактивті карта уақытша қолжетімсіз, бірақ ситтер нәтижелері төменде көрсетілген.',
      noMatch: 'Бұл сүзгілерге сай координатасы бар ситтерлер табылмады.',
      noFilterMatch: 'Ағымдағы сүзгілерге сай ситтерлер табылмады.',
      noRadiusMatch: (distance) => `${distance} км радиуста ситтер табылмады.`,
      noCoordinates: 'Сәйкес ситтерлер бар, бірақ олар карта координаттарын әлі толтырмаған.',
      noCoordinatesSuffix: (count) => `${count} ситтер профиліне картада шығу үшін координаттар жетіспейді.`,
      summary: (count, distance) => `Картада: ${count} ситтер • ${distance} км дейін`,
      distance: 'Қашықтық',
      detectLocation: 'Менің геолокациямды пайдалану',
      locating: 'Геолокация анықталуда...',
      selected: 'Таңдалған ситтер',
      selectedHint: 'Мәліметтерді көру үшін маркерді немесе ситтер картасын таңдаңыз.',
      caringBio: 'Тексерілген профилі бар және жануарға жайлы күтім жасайтын ситтер.',
      kmAway: 'км қашықтықта',
      openProfile: 'Ситтер профилін ашу',
      loading: 'Картадағы ситтерлер жүктелуде...',
      rating: 'Рейтинг',
      cityFallback: 'Алматы',
      locationReady: 'Карта сіздің геолокацияңызға центрленді.',
      pickHint: 'Кеңес: сол маңнан ситтер іздеу үшін картаның кез келген жерін басыңыз.',
      pickedPlace: 'Іздеу аймағы таңдалған орынға ауыстырылды.',
      locationUnavailable: 'Браузердегі геолокация қолжетімсіз. Карта Алматыда қалады.',
      locationDenied: 'Геолокацияға рұқсат берілмеді. Карта Алматыда қалады.',
      mapPin: 'Іздеу аймағы',
      searchRadius: (distance) => `Іздеу радиусы: ${distance} км`,
      serviceZone: (distance) => `Ситтердің қызмет аймағы: ${distance} км`,
      pricePerDay: 'күніне',
      verified: 'Тексерілген',
      tilesUnavailable: 'Карта тайлдары жүктелмеді. Байланысты тексеріп, қайта көріңіз.',
      retryTiles: 'Картаны қайта жүктеу',
      sort: 'Сұрыптау',
      nearest: 'Алдымен жақындары',
      bestRating: 'Ең жоғары рейтинг',
      lowestPrice: 'Ең төмен баға',
      showInList: 'Осы жиынды тізімде көрсету',
      mapTab: 'Карта',
      listTab: 'Тізім',
      emptyTitle: 'Картада әзірге көрсететін ештеңе жоқ',
      serviceArea: 'Қызмет аймағы',
    },
  }[language] || {};

  textRef.current = t;

  const queryString = useMemo(
    () => buildQuery(filters, activeCenter, activeMaxDistance, activeSort),
    [activeCenter, activeMaxDistance, activeSort, filters]
  );

  const emptyReason = useMemo(() => {
    if (loading || sitters.length) return '';
    if (!stats.total_count) return t.noFilterMatch || 'No sitters match the current filters yet.';
    if (!stats.with_location_count && stats.without_location_count > 0) {
      const suffix = t.noCoordinatesSuffix?.(stats.without_location_count);
      return `${t.noCoordinates || 'Matching sitters exist, but they have not filled in their map coordinates yet.'}${suffix ? ` ${suffix}` : ''}`;
    }
    if (stats.with_location_count > 0 && !stats.in_radius_count && activeMaxDistance > 0) {
      return t.noRadiusMatch?.(activeMaxDistance) || `No sitters were found within ${activeMaxDistance} km.`;
    }
    return t.noMatch || 'No sitters with map coordinates match these filters yet.';
  }, [activeMaxDistance, loading, sitters.length, stats, t]);

  const summary = useMemo(() => {
    if (!sitters.length) return emptyReason || t.noMatch || 'No sitters with map coordinates match these filters yet.';
    if (!activeMaxDistance) {
      if (language === 'ru') return `На карте показаны все ситтеры: ${sitters.length}`;
      if (language === 'kz') return `Картада барлық ситтерлер: ${sitters.length}`;
      return `${sitters.length} sitters shown on the map (any distance)`;
    }
    return t.summary?.(sitters.length, activeMaxDistance) || `${sitters.length} sitters shown on the map within ${activeMaxDistance} km`;
  }, [activeMaxDistance, emptyReason, language, sitters.length, t]);

  const visibleError = error && error !== (t.unavailable || 'Interactive map is temporarily unavailable, but sitter results are shown below.')
    ? error
    : '';

  function updateCenter(nextCenter) {
    if (onCenterChange) onCenterChange(nextCenter);
    else setInternalCenter(nextCenter);
  }

  function updateMaxDistance(nextDistance) {
    if (onMaxDistanceChange) onMaxDistanceChange(nextDistance);
    else setInternalMaxDistance(nextDistance);
  }

  function updateSort(nextSort) {
    if (onSortChange) onSortChange(nextSort);
    else setInternalSort(nextSort);
  }

  const [pickedPlace, setPickedPlace] = useState(false);

  // Lets the user choose the search center by clicking on the map.
  pickCenterRef.current = (latlng) => {
    const nextCenter = normalizeCenter({ lat: latlng?.lat, lng: latlng?.lng });
    if (!nextCenter) return;
    // A clicked place is only for this search; it is not remembered for the next visit.
    setHasBrowserLocation(false);
    setPickedPlace(true);
    setSelected(null);
    setError('');
    updateCenter(nextCenter);
  };

  function handleLocationSuccess(position, { silent = false } = {}) {
    const nextCenter = normalizeCenter({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });

    if (!nextCenter) {
      if (!silent) {
        setError(t.locationUnavailable || 'Browser geolocation is unavailable. The map stays centered on Almaty.');
      }
      setIsLocating(false);
      return;
    }

    saveMapCenter(nextCenter);
    setHasBrowserLocation(true);
    updateCenter(nextCenter);
    setError('');
    setIsLocating(false);
  }

  function handleLocationError({ silent = false } = {}) {
    if (!silent) {
      setError(t.locationDenied || 'Location permission was blocked. The map stays centered on Almaty.');
    }
    setIsLocating(false);
  }

  function requestBrowserLocation({ silent = false } = {}) {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      if (!silent) {
        setError(t.locationUnavailable || 'Browser geolocation is unavailable. The map stays centered on Almaty.');
      }
      return false;
    }

    if (!silent) setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => handleLocationSuccess(position, { silent }),
      () => handleLocationError({ silent }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );

    return true;
  }

  function clearTileDiagnosticsTimer() {
    if (tileDiagnosticsTimerRef.current) {
      clearTimeout(tileDiagnosticsTimerRef.current);
      tileDiagnosticsTimerRef.current = null;
    }
  }

  function clearTransientMapError() {
    setError((prev) => (
      prev === (textRef.current.unavailable || 'Interactive map is temporarily unavailable, but sitter results are shown below.')
        ? ''
        : prev
    ));
  }

  function getMarkerStyle(isSelected) {
    return {
      radius: isSelected ? 14 : 11,
      bubblingMouseEvents: false,
      color: isSelected ? '#7a3513' : '#8f3d15',
      weight: isSelected ? 4 : 3,
      fillColor: isSelected ? '#ff8d2b' : '#f7a74d',
      fillOpacity: 0.98,
    };
  }

  function applyMarkerStyle(marker, isSelected) {
    if (!marker?.setStyle) return;
    marker.setStyle(getMarkerStyle(isSelected));
    marker.bringToFront?.();
  }

  function attachTileDiagnostics(tileLayer) {
    tileLayer.on('loading', () => {
      tileStateRef.current = { hadSuccessfulLoad: false, hadError: false };
      clearTileDiagnosticsTimer();
      setMapDiagnostics('');
    });

    tileLayer.on('tileerror', () => {
      tileStateRef.current.hadError = true;
      clearTileDiagnosticsTimer();
      tileDiagnosticsTimerRef.current = setTimeout(() => {
        if (!tileStateRef.current.hadSuccessfulLoad && tileStateRef.current.hadError) {
          setMapDiagnostics(
            textRef.current.tilesUnavailable || 'Map tiles did not load. Check your connection and try again.'
          );
        }
      }, 1200);
    });

    tileLayer.on('load', () => {
      tileStateRef.current = { hadSuccessfulLoad: true, hadError: false };
      clearTileDiagnosticsTimer();
      setMapDiagnostics('');
    });
  }

  async function ensureMapReady() {
    if (!mapNodeRef.current) return null;
    const L = leafletRef.current || await loadLeaflet();
    leafletRef.current = L;

    if (!mapInstanceRef.current) {
      const map = L.map(mapNodeRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      });
      const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      });

      attachTileDiagnostics(tileLayer);
      tileLayer.addTo(map);

      map.on('click', (event) => pickCenterRef.current?.(event.latlng));
      mapNodeRef.current.style.cursor = 'crosshair';

      mapInstanceRef.current = map;
      tileLayerRef.current = tileLayer;
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    return { L, map: mapInstanceRef.current };
  }

  useEffect(() => {
    setMobileView(defaultMobileView);
  }, [defaultMobileView]);

  useEffect(() => {
    if (restoredSavedCenterRef.current || hasExplicitCenter) return;
    restoredSavedCenterRef.current = true;

    const savedCenter = readSavedMapCenter();
    if (!savedCenter || centersMatch(savedCenter, activeCenter)) return;

    updateCenter(savedCenter);
  }, [activeCenter, hasExplicitCenter]);

  useEffect(() => {
    let cancelled = false;

    if (autoLocateOnMount === false || hasExplicitCenter || autoLocateAttemptedRef.current) return undefined;
    autoLocateAttemptedRef.current = true;

    const permissionsApi = navigator?.permissions?.query
      ? navigator.permissions.query({ name: 'geolocation' }).catch(() => null)
      : Promise.resolve(null);

    permissionsApi.then((status) => {
      if (cancelled || status?.state === 'denied') return;
      requestBrowserLocation({ silent: true });
    });

    return () => {
      cancelled = true;
    };
  }, [autoLocateOnMount, hasExplicitCenter]);

  useEffect(() => {
    let cancelled = false;

    async function fetchSitters() {
      try {
        setLoading(true);
        setError('');
        const data = await api.get(`/api/sitters/map?${queryString}`);
        if (cancelled) return;

        const nextSitters = data.sitters || [];
        const nextStats = data.stats || {
          total_count: nextSitters.length,
          with_location_count: nextSitters.length,
          without_location_count: 0,
          in_radius_count: nextSitters.length,
        };

        setSitters(nextSitters);
        setStats(nextStats);
        setSelected((prev) => {
          if (!nextSitters.length) return null;
          if (!prev) return nextSitters[0];
          return nextSitters.find((item) => item.id === prev.id) || nextSitters[0];
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || (t.unavailable || 'Interactive map is temporarily unavailable, but sitter results are shown below.'));
          setSitters([]);
          setStats({
            total_count: 0,
            with_location_count: 0,
            without_location_count: 0,
            in_radius_count: 0,
          });
          setSelected(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSitters();

    return () => {
      cancelled = true;
    };
  }, [queryString, t.unavailable]);

  useEffect(() => {
    let cancelled = false;
    if (!mapNodeRef.current) return undefined;

    ensureMapReady()
      .then((result) => {
        if (cancelled || !result) return;
        result.map.invalidateSize();
        clearTransientMapError();
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            (prev) => prev || textRef.current.unavailable || 'Interactive map is temporarily unavailable, but sitter results are shown below.'
          );
        }
      });

    return () => {
      cancelled = true;
      clearTileDiagnosticsTimer();
      safeDestroyMap(mapInstanceRef.current);
      leafletRef.current = null;
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      markersRef.current = new Map();
      userMarkerRef.current = null;
      searchRadiusRef.current = null;
      selectedZoneRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    ensureMapReady()
      .then((result) => {
        if (cancelled || !result) return;
        const { L, map } = result;
        map.invalidateSize();
        if (!map._loaded) {
          map.setView([activeCenter.lat, activeCenter.lng], 12, { animate: false });
        }

        markersLayerRef.current?.clearLayers();
        markersRef.current = new Map();

        if (userMarkerRef.current) safeRemoveLayer(userMarkerRef.current);
        if (searchRadiusRef.current) safeRemoveLayer(searchRadiusRef.current);
        if (selectedZoneRef.current) {
          safeRemoveLayer(selectedZoneRef.current);
          selectedZoneRef.current = null;
        }

        searchRadiusRef.current = activeMaxDistance > 0 ? L.circle([activeCenter.lat, activeCenter.lng], {
          radius: activeMaxDistance * 1000,
          color: '#4f6bed',
          weight: 2,
          fillColor: '#4f6bed',
          fillOpacity: 0.08,
          dashArray: '8 8',
          // Not clickable, so a click inside the circle moves the search center.
          interactive: false,
        }).addTo(map) : null;

        const userOuterRing = L.circleMarker([activeCenter.lat, activeCenter.lng], {
          radius: 13,
          color: '#2550e8',
          weight: 3,
          fillColor: '#7f98ff',
          fillOpacity: 0.18,
          bubblingMouseEvents: false,
        });
        const userInnerDot = L.circleMarker([activeCenter.lat, activeCenter.lng], {
          radius: 5,
          color: '#ffffff',
          weight: 2,
          fillColor: '#2550e8',
          fillOpacity: 1,
          bubblingMouseEvents: false,
        });

        userMarkerRef.current = L.featureGroup([userOuterRing, userInnerDot]).addTo(map);
        userMarkerRef.current.bindPopup(`<strong>${t.mapPin || 'Your search area'}</strong>`);
        userOuterRing.bringToFront?.();
        userInnerDot.bringToFront?.();

        sitters.forEach((sitter) => {
          const marker = L.circleMarker([sitter.latitude, sitter.longitude], getMarkerStyle(false)).addTo(markersLayerRef.current);
          marker.bindPopup(`
            <div style="min-width: 190px;">
              <strong>${sitter.full_name}</strong><br/>
              ${t.rating || 'Rating'}: ${formatRating(sitter.rating, sitter.rating_count, language)}<br/>
              ${t.distance || 'Distance'}: ${Number(sitter.distance_km || 0).toFixed(1)} km
            </div>
          `);
          marker.on('click', () => {
            setSelected(sitter);
            setMobileView('list');
          });
          if (selected?.id === sitter.id) {
            applyMarkerStyle(marker, true);
          }
          markersRef.current.set(sitter.id, marker);
        });

        const bounds = searchRadiusRef.current
          ? searchRadiusRef.current.getBounds()
          : L.latLngBounds([[activeCenter.lat, activeCenter.lng]]);

        sitters.forEach((sitter) => {
          bounds.extend([sitter.latitude, sitter.longitude]);
        });

        fitMapSafely(map, bounds, activeCenter);

        if (selected?.id) {
          const selectedMarker = markersRef.current.get(selected.id);
          selectedMarker?.openPopup();
          selectedMarker?.bringToFront?.();
        }

        clearTransientMapError();
      })
      .catch(() => {
        if (!cancelled) {
          setError((prev) => prev || t.unavailable || 'Interactive map is temporarily unavailable, but sitter results are shown below.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeCenter, activeMaxDistance, selected?.id, sitters, t.distance, t.mapPin, t.rating, t.searchRadius, t.unavailable]);

  useEffect(() => {
    if (!mapInstanceRef.current || !isMapRenderable(mapInstanceRef.current)) return;

    markersRef.current.forEach((marker, sitterId) => {
      applyMarkerStyle(marker, selected?.id === sitterId);
    });

    if (selectedZoneRef.current) {
      safeRemoveLayer(selectedZoneRef.current);
      selectedZoneRef.current = null;
    }

    if (!selected) return;

    const marker = markersRef.current.get(selected.id);
    try {
      mapInstanceRef.current.panTo([selected.latitude, selected.longitude]);
      applyMarkerStyle(marker, true);
      marker?.openPopup();
      marker?.bringToFront?.();

      if (selected.service_radius_km && leafletRef.current) {
        selectedZoneRef.current = leafletRef.current.circle([selected.latitude, selected.longitude], {
          radius: Number(selected.service_radius_km) * 1000,
          color: '#f29a4d',
          weight: 2,
          fillColor: '#f9c078',
          fillOpacity: 0.1,
        }).addTo(mapInstanceRef.current);
        selectedZoneRef.current.bindPopup(
          `<strong>${t.serviceZone?.(selected.service_radius_km) || `Sitter service zone: ${selected.service_radius_km} km`}</strong>${
            selected.service_area_text ? `<br/>${selected.service_area_text}` : ''
          }`
        );
      }
    } catch (_error) {
      mapInstanceRef.current.setView([activeCenter.lat, activeCenter.lng], 12);
    }
  }, [activeCenter.lat, activeCenter.lng, selected, t.serviceZone]);

  function retryTiles() {
    clearTileDiagnosticsTimer();
    tileStateRef.current = { hadSuccessfulLoad: false, hadError: false };
    setMapDiagnostics('');
    mapInstanceRef.current?.invalidateSize();
    tileLayerRef.current?.redraw();
  }

  function useMyLocation() {
    requestBrowserLocation();
  }

  function resetToAlmaty() {
    try { window.localStorage.removeItem(MAP_CENTER_STORAGE_KEY); } catch (_error) { /* ignore */ }
    setHasBrowserLocation(false);
    setPickedPlace(false);
    setSelected(null);
    setError('');
    updateCenter(DEFAULT_CENTER);
  }

  // Leaflet does not notice when its box changes size (mobile tabs, layout shifts),
  // which leaves grey empty areas. Re-measure the map whenever the box resizes.
  useEffect(() => {
    if (typeof window === 'undefined' || !mapNodeRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      const map = mapInstanceRef.current;
      if (map && isMapRenderable(map)) map.invalidateSize();
    });
    observer.observe(mapNodeRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (mobileView !== 'map') return undefined;
    const timer = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150);
    return () => clearTimeout(timer);
  }, [mobileView]);

  return (
    <section className="rounded-[30px] border border-nanny-orange/15 bg-white p-5 shadow-soft lg:p-6">
      {(title || subtitle || controlsSlot) && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              {title && <h2 className="text-2xl font-bold text-nanny-blue lg:text-3xl">{title}</h2>}
              {subtitle && <p className="mt-2 max-w-3xl text-sm opacity-70">{subtitle}</p>}
            </div>
            <div className="flex flex-wrap gap-3">
              {controlsSlot}
              <label className="text-sm">
                <span className="mb-1 block font-semibold">{t.sort || 'Sort'}</span>
                <select
                  className="input min-w-[170px]"
                  value={activeSort}
                  onChange={(event) => updateSort(event.target.value)}
                >
                  <option value="nearest">{t.nearest || 'Nearest first'}</option>
                  <option value="best_rating">{t.bestRating || 'Best rating'}</option>
                  <option value="lowest_price">{t.lowestPrice || 'Lowest price'}</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold">{t.distance || 'Distance'}</span>
                <select
                  className="input min-w-[160px]"
                  value={activeMaxDistance}
                  onChange={(event) => updateMaxDistance(Number(event.target.value))}
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={15}>15 km</option>
                  <option value={25}>25 km</option>
                  <option value={40}>40 km</option>
                  <option value={0}>{language === 'ru' ? 'Везде' : language === 'kz' ? 'Барлық жерде' : 'Anywhere'}</option>
                </select>
              </label>
              <button type="button" className="btn-ghost self-end" onClick={useMyLocation} disabled={isLocating}>
                {isLocating ? (t.locating || 'Detecting location...') : (t.detectLocation || 'Use my location')}
              </button>
              <label className="text-sm">
                <span className="mb-1 block font-semibold">{language === 'ru' ? 'Район' : language === 'kz' ? 'Аудан' : 'District'}</span>
                <select
                  className="input min-w-[170px]"
                  value=""
                  onChange={(event) => {
                    const district = ALMATY_DISTRICTS.find((item) => item.key === event.target.value);
                    if (district) pickCenterRef.current?.({ lat: district.lat, lng: district.lng });
                  }}
                >
                  <option value="">{language === 'ru' ? 'Выбрать район...' : language === 'kz' ? 'Ауданды таңдау...' : 'Choose a district...'}</option>
                  {ALMATY_DISTRICTS.map((item) => <option key={item.key} value={item.key}>{item[language] || item.en}</option>)}
                </select>
              </label>
              <button type="button" className="btn-ghost self-end" onClick={resetToAlmaty}>
                {language === 'ru' ? 'Центр Алматы' : language === 'kz' ? 'Алматы орталығы' : 'Almaty center'}
              </button>
              {listHref && (
                <Link href={listHref} className="btn-secondary self-end">
                  {t.showInList || 'Show same set in list'}
                </Link>
              )}
            </div>
          </div>

          <div className="flex gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileView('map')}
              className={`btn text-sm ${mobileView === 'map' ? 'btn-secondary' : 'btn-ghost'}`}
            >
              {t.mapTab || 'Map'}
            </button>
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className={`btn text-sm ${mobileView === 'list' ? 'btn-secondary' : 'btn-ghost'}`}
            >
              {t.listTab || 'List'}
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-nanny-brownish">
        {summary}
        {hasBrowserLocation && ` ${t.locationReady || 'Map centered on your location.'}`}
        {pickedPlace && !hasBrowserLocation && ` ${t.pickedPlace || 'Search area moved to the selected place.'}`}
      </p>
      {!loading && !sitters.length && activeMaxDistance > 0 && stats.with_location_count > 0 && (
        <button type="button" className="btn-secondary mt-3 text-sm" onClick={() => updateMaxDistance(0)}>
          {language === 'ru' ? 'Показать ситтеров везде' : language === 'kz' ? 'Барлық жердегі ситтерлерді көрсету' : 'Show sitters everywhere'}
        </button>
      )}
      <p className="mt-1 text-xs text-nanny-brownish/60">{t.pickHint || 'Tip: click anywhere on the map to search for sitters around that place.'}</p>
      {visibleError && <p className="mt-3 text-sm text-red-600">{visibleError}</p>}
      {mapDiagnostics && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>{mapDiagnostics}</p>
          <button type="button" className="btn-ghost text-sm" onClick={retryTiles}>
            {t.retryTiles || 'Retry map'}
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.55fr)_360px]">
        <div className={mobileView === 'list' ? 'hidden md:block' : ''}>
          <div className="overflow-hidden rounded-[28px] border border-nanny-orange/20 bg-white shadow-soft">
            <div ref={mapNodeRef} className="h-[420px] w-full bg-nanny-cream/60 md:h-[520px]" />
          </div>
        </div>

        <aside className={`space-y-4 ${mobileView === 'map' ? 'hidden md:block' : ''}`}>
          <div className="rounded-[28px] border border-nanny-orange/20 bg-white p-5 shadow-soft">
            <h3 className="text-lg font-bold text-nanny-deepOrange">{t.selected || 'Selected sitter'}</h3>
            {selected ? (
              <>
                <img onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/pet-placeholder.png'; }}
                  src={selected.avatar_url ? absoluteAssetUrl(selected.avatar_url) : '/pet-placeholder.png'}
                  alt={selected.full_name}
                  className="mt-4 h-44 w-full rounded-2xl object-cover"
                />
                <div className="mt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-bold">{selected.full_name}</div>
                      <div className="mt-1 text-sm opacity-70">{sitterAddress(selected, t.cityFallback || 'Almaty')}</div>
                    </div>
                    {selected.is_verified && (
                      <span className="badge bg-green-100 text-green-700">✓ {t.verified || 'Verified'}</span>
                    )}
                  </div>
                  <p className="mt-3 text-sm opacity-75">{selected.description || t.caringBio || 'Caring sitter with verified profile and pet-friendly routine.'}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    <span className="badge bg-blue-100 text-nanny-blue">⭐ {formatRating(selected.rating, selected.rating_count, language)}</span>
                    <span className="badge bg-nanny-yellow/80 text-nanny-brownish">{Number(selected.distance_km || 0).toFixed(1)} {t.kmAway || 'km away'}</span>
                    {selected.price_per_day != null && (
                      <span className="badge bg-nanny-cream text-nanny-brownish">
                        {Number(selected.price_per_day).toLocaleString()} ₸ {t.pricePerDay || 'per day'}
                      </span>
                    )}
                    {selected.service_radius_km != null && (
                      <span className="badge bg-orange-50 text-nanny-deepOrange">
                        {t.serviceArea || 'Service area'}: {Number(selected.service_radius_km)} km
                      </span>
                    )}
                  </div>
                  {selected.service_area_text && (
                    <p className="mt-3 text-xs opacity-65">{selected.service_area_text}</p>
                  )}
                  <Link href={`/sitters/${selected.id}`} className="btn-primary mt-4 block w-full text-center">
                    {t.openProfile || 'Open sitter profile'}
                  </Link>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-nanny-orange/20 bg-nanny-cream/35 p-4 text-sm opacity-75">
                <p className="font-semibold text-nanny-deepOrange">{t.emptyTitle || 'Nothing to show on the map yet'}</p>
                <p className="mt-2">{emptyReason || t.selectedHint || 'Choose a marker or sitter card to view details.'}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {loading && <p className="text-sm opacity-60">{t.loading || 'Loading sitters on the map...'}</p>}
            {!loading && sitters.map((sitter) => (
              <button
                key={sitter.id}
                type="button"
                onClick={() => setSelected(sitter)}
                className={`w-full rounded-2xl border p-4 text-left shadow-soft transition ${
                  selected?.id === sitter.id
                    ? 'border-nanny-orange bg-white ring-2 ring-nanny-orange/20'
                    : 'border-nanny-orange/20 bg-white hover:border-nanny-orange/50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{sitter.full_name}</div>
                    <div className="truncate text-xs opacity-60">{sitterAddress(sitter, t.cityFallback || 'Almaty')}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div>⭐ {formatRating(sitter.rating, sitter.rating_count, language)}</div>
                    <div className="opacity-60">{Number(sitter.distance_km || 0).toFixed(1)} km</div>
                  </div>
                </div>
              </button>
            ))}
            {!loading && !sitters.length && (
              <div className="rounded-2xl border border-dashed border-nanny-orange/20 bg-nanny-cream/35 p-4 text-sm opacity-75">
                <p className="font-semibold text-nanny-deepOrange">{t.emptyTitle || 'Nothing to show on the map yet'}</p>
                <p className="mt-2">{emptyReason}</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
