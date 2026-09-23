export const DEFAULT_MAP_CENTER = { lat: 43.238949, lng: 76.889709 };
export const DEFAULT_MAP_DISTANCE = 15;
export const DEFAULT_MAP_SORT = 'nearest';
export const VALID_MAP_SORTS = ['nearest', 'best_rating', 'lowest_price'];

export function normalizeMapSort(value) {
  return VALID_MAP_SORTS.includes(value) ? value : DEFAULT_MAP_SORT;
}

export function parseMapStateFromQuery(query = {}) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  const maxDistance = Number(query.max_distance);

  return {
    center: {
      lat: Number.isFinite(lat) ? lat : DEFAULT_MAP_CENTER.lat,
      lng: Number.isFinite(lng) ? lng : DEFAULT_MAP_CENTER.lng,
    },
    maxDistance: Number.isFinite(maxDistance) && maxDistance > 0 ? maxDistance : DEFAULT_MAP_DISTANCE,
    sort: normalizeMapSort(query.sort),
  };
}

export function buildSitterRouteQuery(filters = {}, mapState = {}) {
  const query = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value === '' || value == null) return;
    if (key === 'verified_only') {
      if (value === false) query.verified_only = '0';
      return;
    }
    query[key] = String(value);
  });

  if (mapState.center?.lat != null) query.lat = String(mapState.center.lat);
  if (mapState.center?.lng != null) query.lng = String(mapState.center.lng);
  if (mapState.maxDistance != null) query.max_distance = String(mapState.maxDistance);
  if (mapState.sort) query.sort = normalizeMapSort(mapState.sort);

  return query;
}
