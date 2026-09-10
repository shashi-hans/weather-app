/**
 * Two build targets share this config.
 *
 * The default is the web app on Vercel, which keeps the /api/weather route so the
 * OpenWeatherMap key stays on the server.
 *
 * Setting BUILD_TARGET=static produces the files bundled into the Android app. That
 * build has no server, so it exports plain HTML and the app calls Open-Meteo directly,
 * falling back to the hosted route. A static export cannot contain a request-driven
 * route handler, so scripts/build-android.mjs moves app/api aside for that build.
 */
const isStatic = process.env.BUILD_TARGET === 'static'

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isStatic ? { output: 'export', distDir: '.next-static' } : {}),
  images: {
    // A static export has no image optimiser.
    unoptimized: isStatic,
    remotePatterns: [{ protocol: 'https', hostname: 'openweathermap.org' }],
  },
}

module.exports = nextConfig
