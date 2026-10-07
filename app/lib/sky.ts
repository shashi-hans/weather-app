/**
 * What the sky behind the whole page should look like for a condition.
 *
 * Kept apart from the components that draw it, because three of them need the same
 * answer: the gradient, the cloud field and the precipitation canvas.
 */

export type Scene = 'clear' | 'cloud' | 'rain' | 'snow' | 'storm' | 'haze'

/**
 * How much falls, and how thick the cloud is above it.
 *
 * 'drizzle' is a rain level only. It is its own step rather than the bottom of
 * 'light', because drizzle is a different thing from a light shower: many small
 * drops that barely fall, against fewer proper ones.
 */
export type Weight = 'drizzle' | 'light' | 'medium' | 'heavy'

export type Reading = { scene: Scene; weight: Weight }

/**
 * How hard it is raining, from the condition id.
 *
 * The shower ids are the trap: 520 is a slight shower and 522 a violent one, so a
 * plain "500s are light, anything above is heavy" rule puts a passing shower under
 * the same downpour as a cloudburst.
 */
function rainWeight(code: number): Weight {
  if (code === 500 || code === 520) return 'light'
  if (code === 501 || code === 521 || code === 511) return 'medium'
  return 'heavy'
}

/** OpenWeather condition ids. Open-Meteo readings arrive already translated to these. */
export function readingFor(code: number): Reading {
  if (code >= 200 && code < 300) return { scene: 'storm', weight: 'heavy' }
  if (code >= 300 && code < 400) return { scene: 'rain', weight: 'drizzle' }
  if (code >= 500 && code < 600) return { scene: 'rain', weight: rainWeight(code) }
  if (code >= 600 && code < 700) {
    return { scene: 'snow', weight: code === 602 || code === 622 ? 'heavy' : 'medium' }
  }
  if (code === 701 || code === 741) return { scene: 'haze', weight: 'medium' }
  if (code === 800) return { scene: 'clear', weight: 'light' }
  if (code === 801) return { scene: 'cloud', weight: 'light' }
  if (code === 802) return { scene: 'cloud', weight: 'medium' }
  return { scene: 'cloud', weight: 'heavy' }
}

/**
 * The sky for a condition, top to bottom.
 *
 * Kept below true daylight brightness, because white text and pale panels sit over
 * it. The scrim above it carries the rest of the contrast.
 */
export function skyFor(scene: Scene, weight: Weight, isDay: boolean): string {
  const sky = (...stops: string[]) => `linear-gradient(175deg, ${stops.join(', ')})`

  if (scene === 'storm') return sky('#111525', '#1d2335 50%', '#2b3247')

  if (scene === 'rain') {
    return isDay
      ? sky('#3b4a60', '#54677f 50%', '#6d7f96')
      : sky('#0b1226', '#151d38 50%', '#202942')
  }

  if (scene === 'snow') {
    return isDay
      ? sky('#5f7593', '#7c8fae 50%', '#97a9c4')
      : sky('#151c36', '#212a4c 50%', '#2e385c')
  }

  if (scene === 'haze') {
    return isDay
      ? sky('#6f6e67', '#8a877d 50%', '#a3a093')
      : sky('#1f212e', '#2c2e3d 50%', '#393b4c')
  }

  if (scene === 'cloud') {
    if (isDay) {
      if (weight === 'heavy') return sky('#4e5a68', '#68727f 50%', '#828b96')
      if (weight === 'medium') return sky('#33587f', '#5a7e9f 50%', '#7f9cba')
      return sky('#255c96', '#4c82b4 50%', '#78a6cf')
    }
    if (weight === 'heavy') return sky('#0f1424', '#1a2038 50%', '#262d47')
    return sky('#0a1030', '#141b40 50%', '#1e2650')
  }

  return isDay
    ? sky('#1a5fa8', '#3f82c0 50%', '#75aede')
    : sky('#05091f', '#0e1538 50%', '#1a2250')
}

export type SkyStops = {
  /** Sky at the top and at the bottom. */
  top: string
  bottom: string
  /** The cloud where it catches light, and where it falls into shadow. */
  lit: string
  shadow: string
}

/**
 * The same skies as `skyFor`, given as four flat colours instead of a gradient
 * string, which is what the shader needs. Kept beside it so the two cannot drift
 * apart: the gradient is what a device with no WebGL falls back to.
 */
export function skyStopsFor(scene: Scene, weight: Weight, isDay: boolean): SkyStops {
  /*
   * At night cloud is only a little lighter than the sky behind it. Lifting it to
   * daytime brightness is what makes a night sky look like a photograph of a day one.
   */
  const cloud = isDay
    ? { lit: '#f4f7fb', shadow: '#6f7f94' }
    : { lit: '#49536e', shadow: '#10162a' }

  if (scene === 'storm') {
    return { top: '#111525', bottom: '#2b3247', lit: '#9aa4b8', shadow: '#0d1019' }
  }
  if (scene === 'rain') {
    return isDay
      ? { top: '#3b4a60', bottom: '#6d7f96', lit: '#dfe6ef', shadow: '#4a5a70' }
      : { top: '#0b1226', bottom: '#202942', ...cloud }
  }
  if (scene === 'snow') {
    return isDay
      ? { top: '#5f7593', bottom: '#97a9c4', lit: '#ffffff', shadow: '#77899f' }
      : { top: '#151c36', bottom: '#2e385c', ...cloud }
  }
  if (scene === 'haze') {
    return isDay
      ? { top: '#6f6e67', bottom: '#a3a093', lit: '#d8d5c9', shadow: '#6d6b62' }
      : { top: '#1f212e', bottom: '#393b4c', lit: '#7b7e90', shadow: '#22242f' }
  }
  if (scene === 'cloud') {
    if (isDay) {
      if (weight === 'heavy') return { top: '#4e5a68', bottom: '#828b96', ...cloud }
      if (weight === 'medium') return { top: '#33587f', bottom: '#7f9cba', ...cloud }
      return { top: '#255c96', bottom: '#78a6cf', ...cloud }
    }
    return weight === 'heavy'
      ? { top: '#0f1424', bottom: '#262d47', ...cloud }
      : { top: '#0a1030', bottom: '#1e2650', ...cloud }
  }
  return isDay
    ? { top: '#1a5fa8', bottom: '#75aede', ...cloud }
    : { top: '#05091f', bottom: '#1a2250', ...cloud }
}

/** A #rrggbb colour as the 0..1 triple a shader uniform takes. */
export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Cloud cover for a condition, as the share of the sky the cloud field should fill. */
export function cloudCoverFor(scene: Scene, weight: Weight): number {
  if (scene === 'clear') return 0
  if (scene === 'haze') return 0.25
  if (scene === 'storm') return 1
  if (scene === 'cloud') return weight === 'heavy' ? 0.95 : weight === 'medium' ? 0.6 : 0.3
  return weight === 'heavy' ? 1 : 0.8
}
