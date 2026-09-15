# Play Store Data safety declaration

Answers to enter in Play Console under **App content > Data safety** for Weather Sky
(`in.coverstack.weathernow`). Each answer below is backed by code in this repo, cited by
file and line. Re-check this file whenever the app starts sending something new off the
device.

## What leaves the device

Every network call the app makes goes to our own `/api/weather` route
(`app/lib/weatherClient.ts:16-30`). No weather or geocoding service is called from the
device, so those third parties see our backend's IP address and never the device's.

Two things are sent to our backend:

1. Device coordinates, at full GPS precision, in the request URL
   (`app/hooks/useCityWeather.ts:129` and `app/lib/weatherClient.ts:21-23`).
2. The city name the user typed, when they search instead of using location.

The backend rounds coordinates to two decimal places, about 1.1 km, before calling any
outside service (`app/api/weather/route.ts:66-75`, `app/lib/providers/geocode.ts:85-86`).

Nothing else is transmitted. There are no accounts, no analytics SDK, no ad SDK and no
crash reporting. The saved city list, theme choice and last reading stay in device
storage and are never uploaded.

## Section 1: Data collection and security

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes.** All traffic is HTTPS and the WebView blocks mixed content (`android-shell/capacitor.config.json`, `allowMixedContent: false`). |
| Do you provide a way for users to request that their data is deleted? | **No.** There is no account and nothing is stored against a user, so there is nothing to delete on request. On-device data is cleared by clearing app storage. |

## Section 2: Data types

Declare exactly these three. Leave every other category unselected.

### Location > Approximate location

| Field | Answer |
| --- | --- |
| Collected | Yes |
| Shared | Yes |
| Processed ephemerally only | No |
| Required or optional | **Optional** (user can refuse the permission and search by city) |
| Purposes | App functionality |

Rounded coordinates are sent to Open-Meteo (Germany), OpenWeatherMap (Latvia),
BigDataCloud and OpenStreetMap Nominatim so they can return a forecast, an air
quality reading and a place name. Air quality uses a second Open-Meteo host
(`app/lib/providers/airQuality.ts`), which adds no new recipient and no new data:
the same rounded coordinates, rounded again before the call.
That transfer to a third party is what makes this **Shared**. The forecast answer is held
in an in-memory cache for 10 minutes, keyed by the rounded coordinates
(`app/api/weather/route.ts:21,131-139`; key format in `app/lib/providers/types.ts:8-12`),
which is why this is not "ephemeral only".

### Location > Precise location

| Field | Answer |
| --- | --- |
| Collected | Yes |
| Shared | No |
| Processed ephemerally only | No |
| Required or optional | **Optional** |
| Purposes | App functionality |

Full-precision coordinates reach our backend but are never forwarded. They appear in the
request URL, so they can land in the hosting platform's request logs. That retention is
why "ephemerally only" is No. See "Open item" below for the change that would let this row
be dropped.

### App activity > Search history

| Field | Answer |
| --- | --- |
| Collected | Yes |
| Shared | Yes |
| Processed ephemerally only | No |
| Required or optional | Optional |
| Purposes | App functionality |

This covers the city name a user types. It is sent to our backend, forwarded to the
weather providers, and held in the 10-minute response cache under a `city:<name>` key.
No identifier is attached to it.

## Store listing fields

- Privacy policy URL: `https://<deployed-domain>/privacy` (the page lives at
  `app/privacy/page.tsx`). Enter the real domain the app is built against, the same
  origin as `NEXT_PUBLIC_WEATHER_API_BASE`.
- The policy must name every third party listed above. It already does
  (`app/privacy/page.tsx:72-76`).

## Open item before submitting

The privacy policy says coordinates "are not stored against you"
(`app/privacy/page.tsx:52-56`). The 10-minute in-memory cache does store the forecast
answer keyed by rounded coordinates. Play checks the policy against this form, so add one
sentence to the policy covering that cache, or the two documents disagree.

Optional improvement: round coordinates to two decimal places on the device, before the
call in `app/hooks/useCityWeather.ts:129`. Precise location would then never leave the
device, the "Precise location" row above could be removed, and the host's request logs
would hold only a 1 km area. This is a small change and it reduces what has to be declared.
