# 🌤️ WeatherNow — Beautiful Weather App

A stunning weather application built with **Next.js 14**, **React**, **Recharts**, and **Tailwind CSS**.

## ✨ Features

- 🌡️ **Current conditions** — temperature, feels like, humidity, wind, pressure, visibility
- ⏰ **Hourly forecast** — scrollable cards + interactive area chart. The free OpenWeather plan returns 3-hour slots, so 24 cards cover 72 hours; headings show the span the data actually covers.
- 📅 **Multi-day forecast** — clickable day selector with detailed breakdown. The free plan covers 5 days, so the heading reads "5-Day Forecast" with a live key and "7-Day Forecast" in demo mode.
- 📊 **Beautiful charts** — temperature range bar chart + humidity/rain chart (Recharts)
- 💨 **Wind compass** — visual direction indicator
- ☀️ **UV Index bar** — color-coded severity scale
- 🌙 **Day/Night toggle** — smooth theme transition with auto-detect from system time
- 📍 **Location detection** — automatic GPS or manual city search
- 🏙️ **City search** — with popular city quick-select
- 📱 **Fully responsive** — laptop, desktop, tablet, mobile
- 🎭 **Demo mode** — works without an API key using realistic mock data

## 🚀 Getting Started

### 1. Install dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Add your API key (optional — app works in demo mode without it)
\`\`\`bash
cp .env.local.example .env.local
\`\`\`
Edit `.env.local` and replace `YOUR_API_KEY_HERE` with your key from [openweathermap.org](https://openweathermap.org/api)

> The free tier gives you 1,000 calls/day — plenty for personal use.

### 3. Run the development server
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

### 4. Build for production
\`\`\`bash
npm run build
npm start
\`\`\`

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 14 | Framework, App Router, API routes |
| React 18 | UI components, hooks |
| Recharts | Temperature & humidity charts |
| Tailwind CSS | Utility styling |
| CSS Variables | Day/Night theming |
| OpenWeatherMap | Weather data (`/data/2.5/weather`, `/forecast`, `/uvi`) |
| Capacitor 6 | Android WebView shell in `android-shell/` |

## 📁 Project Structure

\`\`\`
app/
├── api/weather/route.ts    ← Backend: fetches OpenWeatherMap API
├── components/
│   ├── CurrentWeatherCard  ← Hero card with big temperature
│   ├── HourlyForecastCard  ← hourly scroll + area chart
│   ├── DailyForecastCard   ← day selector
│   ├── WeatherCharts       ← Recharts bar charts
│   ├── ExtraDetails        ← Wind compass, UV, atmosphere
│   ├── SearchBar           ← City search with suggestions
│   ├── DayNightToggle      ← Animated theme toggle
│   └── WeatherSkeleton     ← Loading state
├── hooks/useWeather.ts     ← Custom hook for API calls
├── lib/weather.ts          ← Types, utilities, mock data
├── globals.css             ← Day/night CSS variables + animations
├── layout.tsx
└── page.tsx                ← Main orchestrator
\`\`\`

## 📱 Android APK

`android-shell/` holds a Capacitor project that wraps the deployed site in a native WebView. The app has no bundled UI: it loads the URL in `android-shell/capacitor.config.json` (`server.url`), so it needs a network connection and it shows whatever is currently deployed. The `www/index.html` page is only the offline placeholder.

Rebuild after changing the URL:

\`\`\`bash
cd android-shell
npx cap sync android
cd android
ANDROID_SDK_ROOT=<path-to-android-sdk> ./gradlew assembleDebug
\`\`\`

The APK lands in `android-shell/android/app/build/outputs/apk/debug/app-debug.apk`.

Notes:

- `assembleDebug` produces a debug-signed APK. It installs from a file manager once "install unknown apps" is allowed, but the Play Store needs a release build signed with your own keystore (`assembleRelease`).
- The manifest declares `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` so the "Use My Location" button works. Android asks for the permission on first use; denying it falls back to a city search.
- `minSdkVersion` is 22, so the app installs on Android 5.1 and newer.

## 🎨 Day / Night Themes

The toggle button switches between two complete themes via CSS custom properties. The app also auto-detects your system time — before 6am or after 8pm defaults to Night mode.
