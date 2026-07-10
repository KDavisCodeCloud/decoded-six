import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Privacy Policy',
  description: 'How this site collects, uses, and protects your data.',
}

const CONTACT_EMAIL = 'hello@decodedsix.com'

export default function PrivacyPage() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Decoded Six'
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <>
      <Header />

      <div className="container py-14">
        <div className="max-w-2xl">
          <div className="mb-8 flex items-start gap-3 bg-gold/10 border border-gold/25 rounded-xl px-4 py-3">
            <span className="text-gold text-lg leading-none mt-0.5">⚠</span>
            <p className="text-gold text-sm leading-relaxed">
              Draft — generated from a standard template. Owner must review and confirm
              accuracy (AdSense status, actual analytics/cookie usage, affiliate programs
              live) before this page is published.
            </p>
          </div>

          <h1 className="font-heading font-bold text-4xl text-bright mb-2">Privacy Policy</h1>
          <p className="text-whisper text-sm mb-8">Last updated: {lastUpdated}</p>

          <div className="space-y-6 text-quiet leading-relaxed">
            <p>
              This Privacy Policy explains what information {siteName} collects when you visit,
              why we collect it, and what choices you have. We&apos;ve tried to keep this in plain
              language rather than dense legal text.
            </p>

            <div>
              <h2 className="font-heading font-bold text-lg text-bright mb-2">Cookies</h2>
              <p>
                We use cookies for basic site functionality (like remembering your preferences)
                and to support advertising and analytics, described below. You can block or
                delete cookies in your browser settings at any time; some site features may not
                work as well if you do.
              </p>
            </div>

            <div>
              <h2 className="font-heading font-bold text-lg text-bright mb-2">
                Advertising (Google AdSense)
              </h2>
              <p>
                We use, or plan to use, Google AdSense to show ads on this site. Google and its
                partners may use cookies and similar technology to serve ads based on your prior
                visits to this and other websites. You can opt out of personalized advertising by
                visiting{' '}
                <a
                  href="https://adssettings.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-flame hover:underline"
                >
                  Google Ads Settings
                </a>.
              </p>
            </div>

            <div>
              <h2 className="font-heading font-bold text-lg text-bright mb-2">Analytics</h2>
              <p>
                We use analytics tools to understand which pages are popular and how visitors
                use the site — things like page views, general location (country/region), and
                device type. This data is aggregated and isn&apos;t used to personally identify you.
              </p>
            </div>

            <div>
              <h2 className="font-heading font-bold text-lg text-bright mb-2">
                Affiliate links
              </h2>
              <p>
                Some links on this site may be affiliate links, meaning we may earn a commission
                if you click through and make a purchase, at no extra cost to you. We only link to
                products or services relevant to the content you&apos;re reading, and affiliate
                relationships never determine our news coverage or opinions.
              </p>
            </div>

            <div>
              <h2 className="font-heading font-bold text-lg text-bright mb-2">
                Waitlist and email signup
              </h2>
              <p>
                If you join our map waitlist, we store the email address you provide solely to
                notify you when the interactive map launches. We don&apos;t sell or share your
                email with third parties, and you can ask us to remove it at any time by
                emailing us (below).
              </p>
            </div>

            <div>
              <h2 className="font-heading font-bold text-lg text-bright mb-2">
                User-submitted map markers
              </h2>
              <p>
                Once our interactive map is live, players will be able to submit or suggest map
                locations (money spots, collectibles, and similar). Submitted markers are
                reviewed before appearing publicly and should not include personal information —
                please don&apos;t include your name, contact details, or anything else identifying
                in a marker submission.
              </p>
            </div>

            <div>
              <h2 className="font-heading font-bold text-lg text-bright mb-2">
                Children&apos;s privacy
              </h2>
              <p>
                This site is not directed at children under 13, and we do not knowingly collect
                personal information from children under 13.
              </p>
            </div>

            <div>
              <h2 className="font-heading font-bold text-lg text-bright mb-2">
                Changes to this policy
              </h2>
              <p>
                We may update this policy as the site adds features (like the interactive map or
                affiliate partnerships). We&apos;ll update the &quot;Last updated&quot; date above
                whenever we do.
              </p>
            </div>

            <div>
              <h2 className="font-heading font-bold text-lg text-bright mb-2">Contact</h2>
              <p>
                Questions about this policy or your data? Email{' '}
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
