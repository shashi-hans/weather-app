import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Weather Sky',
  description: 'What Weather Sky collects, where it is processed, and who it is shared with.',
}

/** Kept beside the text so the page cannot claim a review date it does not have. */
const LAST_UPDATED = '10 September 2026'

const CONTACT_EMAIL = 'privacy@coverstack.in'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </section>
  )
}

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen px-5 py-10" style={{ background: 'var(--gradient-page)' }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm font-semibold underline" style={{ color: 'var(--accent)' }}>
          ← Back to Weather Sky
        </Link>

        <h1 className="text-2xl font-extrabold mt-4 mb-1" style={{ color: 'var(--text-primary)' }}>
          Privacy Policy
        </h1>
        <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>
          Last updated {LAST_UPDATED}
        </p>

        <Section title="The short version">
          <p>
            Weather Sky does not ask who you are. There is no account, no sign-in and no
            advertising. We do not sell or share your data for advertising.
          </p>
        </Section>

        <Section title="Location">
          <p>
            If you allow it, the app reads your device location to show weather where you are.
            You can refuse, and the app then works by city search instead.
          </p>
          <p>
            Your coordinates are sent to our own server to look up the forecast. They are used
            for that request and are not stored against you, because there is no identifier to
            store them against.
          </p>
          <p>
            Before your coordinates reach any outside weather service, they are rounded to two
            decimal places, roughly one kilometre. Your exact position stays on our server.
          </p>
        </Section>

        <Section title="Where processing happens">
          <p>
            Our backend runs in the Mumbai region (ap-south-1 / bom1), so requests from India are
            received and processed in India.
          </p>
          <p>
            Forecast data itself comes from services outside India. The rounded coordinates or
            the city name you searched are sent to them so they can answer:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Open-Meteo (Germany) — forecasts and city search</li>
            <li>OpenWeatherMap (Latvia / EU) — used only when Open-Meteo cannot answer</li>
            <li>BigDataCloud and OpenStreetMap Nominatim — turning coordinates into a city name</li>
          </ul>
          <p>
            These services receive a rounded location or a city name and nothing else. No name,
            email, device id or account is attached, because the app holds none.
          </p>
        </Section>

        <Section title="What stays on your device">
          <p>
            Your saved city list, your light or dark theme choice and the last weather reading
            are stored in your browser or app storage on the device. They are never uploaded.
            Clearing the app data or the site data removes them.
          </p>
          <p>The stored reading is kept for up to 12 hours so the app still shows something when you are offline.</p>
        </Section>

        <Section title="What we do not collect">
          <p>
            No accounts, no analytics or tracking SDKs, no advertising identifiers, no contacts,
            photos, files or any other data on your device.
          </p>
        </Section>

        <Section title="Children">
          <p>
            The app is not directed at children and collects nothing that identifies any person,
            of any age.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Under the Digital Personal Data Protection Act, 2023 you may ask what personal data we
            hold about you and ask for it to be corrected or erased. Because the app stores nothing
            that identifies you on our servers, we normally hold nothing to return or erase; data on
            your device is under your control and you can clear it at any time.
          </p>
          <p>
            Questions or requests: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </Section>

        <Section title="Permissions the app asks for">
          <p>
            <strong>Location</strong> — to show weather where you are. Optional; refuse it and use
            city search instead.
          </p>
          <p>
            <strong>Internet</strong> — to fetch forecasts.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If this policy changes, the date at the top changes with it. Significant changes will
            be noted in the app.
          </p>
        </Section>
      </div>
    </main>
  )
}
