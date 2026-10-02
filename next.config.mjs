import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Google Search Console 404 cleanup (2026-10-01). These six URLs were all
  // reported as "Not found (404)" with validation failing since 9/14.
  //
  // Deliberately handled here rather than through the articles-table
  // redirect_slug mechanism (news/[slug]/page.tsx), because that mechanism
  // only fires on rows with status='archived', which would mean inventing
  // article rows for slugs that never existed. The articles table is read as
  // the content inventory by the pre-generation dedup gate
  // (src/agents/content/dedup_gate.py) and by topic discovery -- seeding it
  // with phantom rows would poison every future duplicate check. Routing
  // these at the edge keeps the content DB honest.
  //
  // - gta-6-map-locations / gta-6-online-money-spots-tracker /
  //   gta-6-edition-comparison-which-to-buy: slugs that were never published
  //   articles. They came from internal links the writer invented.
  // - gta-6-money-spots: this slug DOES exist as a row, but it is one of the
  //   5 utility stubs deliberately held at status='draft' until 2026-11-26
  //   while the AdSense application is pending. Publishing it (or flipping it
  //   to 'archived' to enable redirect_slug) to clear a 404 is the exact
  //   mistake made on 2026-09-07 and reverted. The row stays untouched.
  // - '/$' and '/&': historical crawler artifacts. Verified 2026-10-01 that
  //   no source emits them -- not in any component, not in any of the 181
  //   article bodies, not in the 492-URL sitemap, not in the live homepage
  //   HTML. Nothing to fix upstream; these only need somewhere to land.
  async redirects() {
    return [
      { source: '/news/gta-6-map-locations', destination: '/guides/gta-6-vice-city-location-details-3', permanent: true },
      { source: '/news/gta-6-money-spots', destination: '/gta-6-complete-guide', permanent: true },
      { source: '/news/gta-6-online-money-spots-tracker', destination: '/gta-6-complete-guide', permanent: true },
      { source: '/news/gta-6-edition-comparison-which-to-buy', destination: '/guides/gta-6-ultimate-edition-vs-standard-edition', permanent: true },
      { source: '/$', destination: '/', permanent: true },
      { source: '/&', destination: '/', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/:locale/opengraph-image',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/:locale/news/:slug/opengraph-image',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/opengraph-image',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/news/:slug/opengraph-image',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
