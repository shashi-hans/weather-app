# 🌤️ WeatherNow — Beautiful Weather App

A stunning weather application built with **Next.js 14**, **React**, **Recharts**, and **Tailwind CSS**.

## ✨ Features

- 🌡️ **Current conditions** — temperature, feels like, humidity, wind, pressure, visibility
- ⏰ **24-hour hourly forecast** — scrollable cards + interactive area chart
- 📅 **7-day forecast** — clickable day selector with detailed breakdown
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
| OpenWeatherMap | Weather data (One Call API 3.0) |

## 📁 Project Structure

\`\`\`
app/
├── api/weather/route.ts    ← Backend: fetches OpenWeatherMap API
├── components/
│   ├── CurrentWeatherCard  ← Hero card with big temperature
│   ├── HourlyForecastCard  ← 24h scroll + area chart
│   ├── DailyForecastCard   ← 7-day selector
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

## 🎨 Day / Night Themes

The toggle button switches between two complete themes via CSS custom properties. The app also auto-detects your system time — before 6am or after 8pm defaults to Night mode.
