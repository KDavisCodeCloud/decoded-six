import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ArticleImage } from '@/components/ArticleImage'
import { unlocalizedAlternates } from '@/lib/seo'
import { AUTHOR_NAME, AUTHOR_PATH, AUTHOR_URL, AUTHOR_ORG, AUTHOR_TITLE } from '@/lib/author'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `${AUTHOR_NAME} — Founder & Editor`,
    description:
      'Kelvin L. Davis II, founder of THD Agentic Systems LLC, on why he built a GTA 6 fan site and how its coverage is made.',
    alternates: unlocalizedAlternates(AUTHOR_PATH),
  }
}

export default function AuthorPage() {
  // Person schema is the point of this page: it replaces a faceless
  // "Editorial Team" Organization byline with a real, named human that
  // search engines can tie to an entity. No `image` here on purpose --
  // the only art we're licensed to show is Rockstar's, and attaching it
  // to a Person would imply it depicts him.
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: AUTHOR_NAME,
    jobTitle: AUTHOR_TITLE,
    worksFor: { '@type': 'Organization', name: AUTHOR_ORG },
    url: AUTHOR_URL,
    mainEntityOfPage: { '@type': 'WebPage', '@id': AUTHOR_URL },
    knowsAbout: [
      'Grand Theft Auto VI',
      'Grand Theft Auto series',
      'Rockstar Games',
      'Red Dead Redemption',
      'Bully',
    ],
  }

  return (
    <>
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <div className="container py-14">
        <div className="max-w-2xl">
          <p className="font-ibm text-xs uppercase tracking-widest text-flame mb-3">
            {AUTHOR_TITLE}
          </p>
          <h1 className="font-heading font-bold text-4xl text-bright mb-2">
            {AUTHOR_NAME}
          </h1>
          <p className="text-quiet mb-8">
            Founder, {AUTHOR_ORG} — and a Grand Theft Auto fan first.
          </p>

          <ArticleImage
            src="/images/tier1/keyart/official-cover-art/Official_Cover_Art_landscape.jpg"
            alt="Grand Theft Auto VI official cover art"
            tier={1}
            priority
            className="rounded-lg mb-3 aspect-[16/9]"
          />
          <p className="text-xs text-quiet/70 mb-10">
            Official cover art for Grand Theft Auto VI. Artwork: © Rockstar Games.
            DecodedSix is an independent fan site and is not affiliated with or
            endorsed by Rockstar Games.
          </p>

          <div className="space-y-6 text-quiet leading-relaxed">
            <p>
              I&apos;m Kelvin L. Davis II, founder of THD Agentic Systems LLC, and a fan of
              the GTA series along with other Rockstar classics like Bully and Red Dead
              Redemption.
            </p>

            <p>
              With the launch of GTA 6, it has been a vision of mine to create a fan site
              that lets fans like myself talk about the game and dig into strategies, tips,
              and tricks during gameplay — much like the other GTA fan platforms built by
              people who love Rockstar Games as much as I do.
            </p>

            <p>
              We worked really hard on this site to give fans the ultimate experience, and
              we&apos;ll keep working at it as more news lands and as we learn how to beat
              missions and explore Leonida. Welcome to the site, and enjoy.
            </p>

            <div className="border-l-2 border-flame/40 pl-5 py-1">
              <h2 className="font-heading font-bold text-lg text-bright mb-2">
                How I handle coverage
              </h2>
              <p>
                I review and sign off on every article before it publishes — nothing goes
                live without editorial approval. Pre-release information moves fast and
                rumors don&apos;t always hold up, so speculation gets labelled as
                speculation and confirmed news gets labelled as confirmed. When Rockstar
                hasn&apos;t published something, we say so instead of guessing. Full detail
                is in our{' '}
                <a href="/about" className="text-flame hover:underline">
                  editorial policy
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="font-heading font-bold text-lg text-bright mb-2">
                Elsewhere on the site
              </h2>
              <p>
                Start with the{' '}
                <a href="/news" className="text-flame hover:underline">
                  latest GTA 6 news
                </a>
                , the{' '}
                <a href="/guides" className="text-flame hover:underline">
                  guides
                </a>
                , or the{' '}
                <a href="/gta-6-complete-guide" className="text-flame hover:underline">
                  complete guide
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
