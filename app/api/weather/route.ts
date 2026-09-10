import { NextRequest, NextResponse } from 'next/server'
import type { WeatherData } from '@/app/lib/weather'
import { getMockWeatherData, isDaytime } from '@/app/lib/weather'
import { ProviderError, queryKey, type WeatherProvider, type WeatherQuery } from '@/app/lib/providers/types'
import { openMeteo } from '@/app/lib/providers/openMeteo'
import { openWeather } from '@/app/lib/providers/openWeather'
import { cacheGet, cacheSet, isExhausted, markExhausted } from '@/app/lib/serverCache'

/**
 * Weather is served by the first provider that answers. Open-Meteo needs no key and
 * carries the UV index, so it leads; OpenWeatherMap stands in when it cannot answer.
 * A provider that reports a quota or rate limit is skipped until its cooldown passes,
 * rather than being retried on every request.
 */
const PROVIDERS: WeatherProvider[] = [openMeteo, openWeather]

/** Longest accepted city name. Keeps a huge string out of the upstream query. */
const MAX_CITY_LENGTH = 100

/** How long a stored answer is reused before a provider is called again. */
const CACHE_TTL_MS = 10 * 60 * 1000

/** Seconds a cache may hold the response. Kept under the store above so the two agree. */
const CACHE_SECONDS = 300

/** How long a provider is skipped after reporting a quota or rate limit. */
const COOLDOWN_MS = 15 * 60 * 1000

/** Ceiling on a single request, so a slow chain cannot hold the route open. */
const REQUEST_BUDGET_MS = 12000

type Answer = { data: WeatherData; provider: string }

/**
 * Parse a coordinate string, returning null when it is not a real number in range.
 * An empty or blank value is rejected rather than accepted: Number('') is 0, which
 * would otherwise be read as a request for 0N 0E.
 */
function parseCoord(value: string | null, limit: number): number | null {
  if (value === null || value.trim() === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || Math.abs(n) > limit) return null
  return n
}

/*
 * The packaged Android app runs on its own origin (https://localhost) and calls this
 * route as its fallback, so the response must be readable cross-origin. The data is
 * public and no cookies or credentials are involved, so any origin may read it.
 */
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

/**
 * Decimal places kept on a coordinate before it is sent to any outside service.
 * Two places is about 1.1 km: enough for an accurate forecast, while the reader's
 * exact position never leaves this backend.
 */
const UPSTREAM_COORD_PRECISION = 2

function coarsen(query: WeatherQuery): WeatherQuery {
  if (query.kind !== 'coords') return query
  return {
    kind: 'coords',
    lat: Number(query.lat.toFixed(UPSTREAM_COORD_PRECISION)),
    lon: Number(query.lon.toFixed(UPSTREAM_COORD_PRECISION)),
  }
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400, headers: CORS_HEADERS })
}

/** Walks the chain, returning the first answer. */
async function fetchFromChain(query: WeatherQuery, signal: AbortSignal): Promise<Answer> {
  let notFound = false
  let lastError: unknown = null
  let tried = 0

  for (const provider of PROVIDERS) {
    if (!provider.isConfigured() || isExhausted(provider.id)) continue
    tried++
    try {
      return { data: await provider.fetchWeather(query, signal), provider: provider.id }
    } catch (err) {
      console.warn(`Weather via ${provider.id} failed:`, err instanceof Error ? err.message : err)
      if (err instanceof ProviderError) {
        // Gazetteers differ, so a name one provider cannot place may still be known
        // to the next. The 404 is only reported once the chain agrees.
        if (err.notFound) { notFound = true; continue }
        if (err.exhausted) markExhausted(provider.id, COOLDOWN_MS)
      }
      lastError = err
    }
  }

  if (tried === 0) throw new ProviderError('No weather provider is available right now')
  if (lastError) throw lastError instanceof Error ? lastError : new ProviderError('Every weather provider failed')
  if (notFound) throw new ProviderError('Location not found', { notFound: true })
  throw new ProviderError('Every weather provider failed')
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const city = searchParams.get('city')?.trim() ?? ''
  const lat  = parseCoord(searchParams.get('lat'), 90)
  const lon  = parseCoord(searchParams.get('lon'), 180)

  if (city.length > MAX_CITY_LENGTH) {
    return badRequest(`City name must be ${MAX_CITY_LENGTH} characters or fewer`)
  }
  if (!city && (searchParams.has('lat') || searchParams.has('lon')) && (lat === null || lon === null)) {
    return badRequest('lat must be -90..90 and lon must be -180..180')
  }

  const query: WeatherQuery | null = city
    ? { kind: 'city', city }
    : lat !== null && lon !== null
    ? { kind: 'coords', lat, lon }
    : null

  if (!query) return badRequest('Provide lat/lon or city')

  const key = queryKey(query)
  const cached = cacheGet<Answer>(key)

  const controller = new AbortController()
  const budget = setTimeout(() => controller.abort(), REQUEST_BUDGET_MS)

  try {
    const answer = cached ?? (await fetchFromChain(coarsen(query), controller.signal))
    if (!cached) cacheSet(key, answer, CACHE_TTL_MS)

    /*
     * The UV feeds report a daily peak rather than the value for the moment asked
     * about, which read as Extreme after sunset. There is no UV after dark.
     * The daily entries keep the peak, which is what a daily UV figure means.
     * A copy is built rather than an edit in place, because `answer` is the object
     * held in the store and the next reader of it may be asking in daylight.
     */
    const stored = answer.data
    const current = isDaytime(stored.current.dt, stored.current.sunrise, stored.current.sunset)
      ? stored.current
      : { ...stored.current, uv_index: 0 }

    return NextResponse.json({ ...stored, current, isMock: false }, {
      headers: {
        ...CORS_HEADERS,
        // A city name is safe to hold in a shared cache. A lat/lon request carries the
        // device's precise position in the URL, which is personal data, so it stays
        // in the requesting browser only and never reaches a CDN or its access logs.
        'Cache-Control': query.kind === 'city'
          ? `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`
          : `private, max-age=${CACHE_SECONDS}`,
        'X-Weather-Provider': answer.provider,
        'X-Weather-Cache': cached ? 'hit' : 'miss',
      },
    })
  } catch (err) {
    if (err instanceof ProviderError && err.notFound) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404, headers: CORS_HEADERS })
    }
    // Log the detail server-side; the client gets a generic message so upstream
    // URLs and keys cannot leak.
    console.error('Weather API error:', err instanceof Error ? err.message : err)

    // Nothing left to try when the only keyed provider has no key, so sample data
    // keeps the app usable instead of an error screen.
    if (!openWeather.isConfigured()) {
      return NextResponse.json({ ...getMockWeatherData(city || 'New York'), isMock: true }, { headers: CORS_HEADERS })
    }

    const timedOut = controller.signal.aborted || (err instanceof Error && err.name === 'TimeoutError')
    return NextResponse.json(
      { error: timedOut ? 'Weather service timed out' : 'Could not load weather right now' },
      { status: timedOut ? 504 : 502, headers: CORS_HEADERS }
    )
  } finally {
    clearTimeout(budget)
  }
}
