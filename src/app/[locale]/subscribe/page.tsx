import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { NewsletterSignup } from '@/components/NewsletterSignup'

export const metadata = {
  title: 'Subscribe',
  description: 'Get GTA 6 news, confirmed details, and launch-day updates the moment they drop.',
}

export default function SubscribePage() {
  return (
    <>
      <Header />

      <div className="container py-14">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h1 className="font-heading font-bold text-4xl text-bright mb-3">
            Subscribe
          </h1>
          <p className="text-quiet leading-relaxed">
            Confirmed news, no leak-chasing spam. One email when something Rockstar actually
            said changes what you know about GTA 6.
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          <NewsletterSignup variant="section" />
        </div>
      </div>

      <Footer />
    </>
  )
}
