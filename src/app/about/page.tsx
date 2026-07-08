import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'About & Editorial Policy',
  description: 'Who runs this site, how content is made, and where it comes from.',
}

const CONTACT_EMAIL = 'hello@decodedsix.com'

export default function AboutPage() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Decoded Six'

  return (
    <>
      <Header />

      <div className="container py-14">
        <div className="max-w-2xl">
          <h1 className="font-heading font-bold text-4xl text-bright mb-8">
            About &amp; Editorial Policy
          </h1>

          <div className="space-y-6 text-quiet leading-relaxed">
            <p>
              {siteName} is an independent fan site built by one player and his son who wanted
              a single place to track news, maps, and guides for the next Grand Theft Auto game.
              We are not affiliated with, endorsed by, or sponsored by the game&apos;s publisher or
              developer in any way. Everything here is our own reporting, curation, and commentary.
            </p>

            <div>
              <h2 className="font-heading font-bold text-lg text-bright mb-2">
                How our content is made
              </h2>
              <p>
                Every article is sourced from public news, official Rockstar announcements,
                and verified community reporting. A human reviews and approves every piece
                before it goes live. Nothing publishes without editorial sign-off.
              </p>
            </div>

            <div>
              <h2 className="font-heading font-bold text-lg text-bright mb-2">
                Accuracy and corrections
              </h2>
              <p>
                Pre-release information changes constantly, and rumors don&apos;t always hold up.
                We label speculation as speculation and confirmed news as confirmed, and we
                correct mistakes as soon as we catch them or hear about them from readers.
              </p>
            </div>

            <div>
              <h2 className="font-heading font-bold text-lg text-bright mb-2">
                How the site supports itself
              </h2>
              <p>
                The site is supported by advertising and, eventually, affiliate links on relevant
                gear and accessories. Ads and affiliate placements never influence what we cover
                or how we cover it. See our{' '}
                <a href="/privacy" className="text-flame hover:underline">
                  Privacy Policy
                </a>{' '}
                for details on cookies and tracking.
              </p>
            </div>

            <div>
              <h2 className="font-heading font-bold text-lg text-bright mb-2">
                Contact
              </h2>
              <p>
                Spot an error, have a tip, or want to reach us for any other reason? Email{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-flame hover:underline">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}
