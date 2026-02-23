import { useState, useEffect } from 'react';

interface WeatherData {
  temperature: number;
  description: string;
  city: string;
}

const CACHE_KEY = 'cortex:weather';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CachedWeather {
  data: WeatherData;
  city: string;
  timestamp: number;
}

function getCached(city: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedWeather = JSON.parse(raw);
    if (cached.city !== city) return null;
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) return null;
    return cached.data;
  } catch {
    return null;
  }
}

function setCache(city: string, data: WeatherData) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, city, timestamp: Date.now() }));
}

// WMO weather code → short description
function describeWeatherCode(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

async function fetchWeather(city: string): Promise<WeatherData> {
  // Geocode city name → coordinates
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
  );
  const geo = await geoRes.json();
  const location = geo.results?.[0];
  if (!location) throw new Error('City not found');

  // Fetch current weather
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code`
  );
  const weather = await weatherRes.json();

  return {
    temperature: Math.round(weather.current.temperature_2m),
    description: describeWeatherCode(weather.current.weather_code),
    city: location.name,
  };
}

export function useWeather(city: string): WeatherData | null {
  const [weather, setWeather] = useState<WeatherData | null>(() =>
    city ? getCached(city) : null
  );

  useEffect(() => {
    if (!city) {
      setWeather(null);
      return;
    }

    const cached = getCached(city);
    if (cached) {
      setWeather(cached);
      return;
    }

    let cancelled = false;

    fetchWeather(city)
      .then((data) => {
        if (cancelled) return;
        setCache(city, data);
        setWeather(data);
      })
      .catch(() => {
        if (!cancelled) setWeather(null);
      });

    return () => { cancelled = true; };
  }, [city]);

  return weather;
}
