/**
 * Straight-line (haversine) distance estimate in kilometers.
 *
 * TO GO LIVE: once you have a GOOGLE_MAPS_API_KEY, replace calls to
 * estimateDistanceKm() with a call to the Google Distance Matrix / Directions
 * API for real road distance + ETA. Keep the function signature the same
 * (lat1, lng1, lat2, lng2) -> { distanceKm, etaMinutes } so callers don't change.
 */
export function estimateDistanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v === undefined || v === null)) return null;
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineKm = R * c;
  // Add a 25% road-winding factor since this is a straight-line estimate, not real routing
  const roadEstimateKm = straightLineKm * 1.25;
  const avgSpeedKmh = 35;
  const etaMinutes = Math.round((roadEstimateKm / avgSpeedKmh) * 60);
  return { distanceKm: Math.round(roadEstimateKm * 10) / 10, etaMinutes };
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
