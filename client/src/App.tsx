import { useEffect, useMemo, useState } from 'react';
import './App.css';

type Coordinates = {
  lat: number;
  lng: number;
};

type HotspotActivity = {
  checklistCount: number;
  observationCount: number;
  lastObservationDate: string | null;
  score: number;
};

type Hotspot = {
  locId: string;
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  regionCode: string;
  distanceKm: number | null;
  url: string;
  activity: HotspotActivity;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

export function App() {
  const [mode, setMode] = useState<'random' | 'top'>('random');
  const [distanceKm, setDistanceKm] = useState(25);
  const [postalCode, setPostalCode] = useState('');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [randomHotspot, setRandomHotspot] = useState<Hotspot | null>(null);
  const [topHotspots, setTopHotspots] = useState<Hotspot[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  const locationLabel = useMemo(() => {
    if (coords) {
      return `Using your GPS location (${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)})`;
    }
    if (postalCode.trim()) {
      return `Using ZIP code ${postalCode.trim()}`;
    }
    return 'Provide a ZIP code or share your location to get started.';
  }, [coords, postalCode]);

  const buildQuery = () => {
    const params = new URLSearchParams({
      distanceKm: distanceKm.toString(),
    });

    if (coords) {
      params.set('lat', coords.lat.toString());
      params.set('lng', coords.lng.toString());
    } else if (postalCode.trim()) {
      params.set('postalCode', postalCode.trim());
    }

    return params.toString();
  };

  const fetchHotspots = async () => {
    setError(null);
    setStatus(null);
    setRandomHotspot(null);
    setTopHotspots([]);
    setHasFetched(false);

    if (!coords && postalCode.trim().length !== 5) {
      setError('Enter a valid 5-digit ZIP code or allow location access.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'random' ? 'hotspots/random' : 'hotspots/top';
      const response = await fetch(`${API_BASE_URL}/${endpoint}?${buildQuery()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? 'Unable to fetch hotspots.');
      }

      if (mode === 'random') {
        setRandomHotspot(payload.hotspot);
      } else {
        setTopHotspots(payload.hotspots ?? []);
      }
      setHasFetched(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    await fetchHotspots();
  };

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }

    setGeolocating(true);
    setStatus('Requesting your location...');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: Number(position.coords.latitude.toFixed(4)),
          lng: Number(position.coords.longitude.toFixed(4)),
        });
        setPostalCode('');
        setGeolocating(false);
        setStatus('Location locked in. Ready when you are!');
      },
      (geoError) => {
        setGeolocating(false);
        setStatus(null);
        setError(geoError.message ?? 'Unable to access your location.');
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
      },
    );
  };

  useEffect(() => {
    setRandomHotspot(null);
    setTopHotspots([]);
    setStatus(null);
    setError(null);
    setHasFetched(false);
  }, [mode]);

  return (
    <div className="app">
      <section className="card">
        <h1>Birding Suggester</h1>
        <p className="muted">
          Discover high-potential eBird hotspots near you. Choose a spontaneous adventure or let the data surface the
          five most active locations from the past week.
        </p>
      </section>

      <section className="card">
        <header className="options">
          <button className={mode === 'random' ? 'active' : ''} onClick={() => setMode('random')}>
            Surprise me
          </button>
          <button className={mode === 'top' ? 'active' : ''} onClick={() => setMode('top')}>
            Top 5 active spots
          </button>
        </header>

        <div className="form-grid">
          <div className="form-control">
            <label htmlFor="distance">Search radius (km)</label>
            <input
              id="distance"
              type="number"
              min={1}
              max={200}
              value={distanceKm}
              onChange={(event) => {
                const value = Number(event.target.value);
                setDistanceKm(Number.isNaN(value) ? 1 : value);
              }}
            />
          </div>
          <div className="form-control">
            <label htmlFor="zip">ZIP code (optional)</label>
            <input
              id="zip"
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 80302"
              value={postalCode}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, '');
                setPostalCode(value);
                if (value) {
                  setCoords(null);
                }
              }}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="secondary" onClick={requestCurrentLocation} disabled={geolocating}>
            {geolocating ? 'Locating...' : 'Use my current location'}
          </button>
          <button className="primary" type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Searching...' : mode === 'random' ? 'Find a random hotspot' : 'Show top hotspots'}
          </button>
          <span className="muted">{locationLabel}</span>
        </div>

        {status && <div className="muted">{status}</div>}
        {error && <div className="error">{error}</div>}
      </section>

      {!loading && mode === 'random' && randomHotspot && (
        <section className="card">
          <h2>Today's pick</h2>
          <div className="result-card">
            <h3>{randomHotspot.name}</h3>
            <p className="muted">
              {randomHotspot.regionCode}, {randomHotspot.countryCode}
            </p>
            <a href={randomHotspot.url} target="_blank" rel="noreferrer">
              View on eBird (opens new tab)
            </a>
            <p className="muted">
              Distance: {randomHotspot.distanceKm !== null ? `${randomHotspot.distanceKm} km` : 'unknown'}
            </p>
            <p className="muted">
              Coordinates: {randomHotspot.latitude.toFixed(3)}, {randomHotspot.longitude.toFixed(3)}
            </p>
            <div className="stats">
              <div className="stat-pill">
                Checklists (7d)
                <strong>{randomHotspot.activity.checklistCount}</strong>
              </div>
              <div className="stat-pill">
                Observations (7d)
                <strong>{randomHotspot.activity.observationCount}</strong>
              </div>
              <div className="stat-pill">
                Activity score
                <strong>{randomHotspot.activity.score}</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {!loading && mode === 'top' && (
        <section className="card">
          <h2>Top 5 active hotspots</h2>
          <p className="muted">
            Ranked by checklists and observations submitted in the last 7 days (score = checklists x 2 + observations).
          </p>
          {!hasFetched ? (
            <p className="muted">Run the search to see the hottest hotspots from the past 7 days.</p>
          ) : topHotspots.length === 0 ? (
            <p className="muted">No hotspots met the 7-day activity threshold within this radius.</p>
          ) : (
            <div className="results-grid">
              {topHotspots.map((spot) => (
                <article key={spot.locId} className="result-card">
                  <h3>{spot.name}</h3>
                  <p className="muted">
                    {spot.regionCode}, {spot.countryCode}
                  </p>
                  <p className="muted">Distance: {spot.distanceKm !== null ? `${spot.distanceKm} km` : 'unknown'}</p>
                  <a href={spot.url} target="_blank" rel="noreferrer">
                    Explore on eBird (opens new tab)
                  </a>
                  <div className="stats">
                    <div className="stat-pill">
                      Checklists
                      <strong>{spot.activity.checklistCount}</strong>
                    </div>
                    <div className="stat-pill">
                      Observations
                      <strong>{spot.activity.observationCount}</strong>
                    </div>
                    <div className="stat-pill">
                      Score
                      <strong>{spot.activity.score}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default App;
