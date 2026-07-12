'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { Components } from 'react-markdown'

// Strip FAQ section — rendered separately as cards below the article body
function stripFaqSection(md: string): string {
  return md
    .replace(/^#{1,3}\s+(frequently asked questions|faq)\b[\s\S]*/im, '')
    .trim()
}

const components: Components = {
  h2({ children }) {
    return (
      <h2 className="font-heading font-bold text-2xl text-bright mt-10 mb-4 leading-tight">
        {children}
      </h2>
    )
  },
  h3({ children }) {
    return (
      <h3 className="font-heading font-bold text-lg text-bright mt-8 mb-3 leading-snug">
        {children}
      </h3>
    )
  },
  p({ children }) {
    return (
      <p className="text-quiet leading-[1.85] mb-6 text-base">
        {children}
      </p>
    )
  },
  ul({ children }) {
    return (
      <ul className="list-disc list-outside pl-5 space-y-2 text-quiet mb-6">
        {children}
      </ul>
    )
  },
  ol({ children }) {
    return (
      <ol className="list-decimal list-outside pl-5 space-y-2 text-quiet mb-6">
        {children}
      </ol>
    )
  },
  li({ children }) {
    return (
      <li className="text-quiet leading-relaxed pl-1">
        {children}
      </li>
    )
  },
  strong({ children }) {
    return <strong className="text-bright font-semibold">{children}</strong>
  },
  em({ children }) {
    return <em className="italic text-quiet">{children}</em>
  },
  a({ href, children }) {
    return (
      <a
        href={href ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="text-flame hover:underline underline-offset-2"
      >
        {children}
      </a>
    )
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-4 border-flame/60 pl-5 italic text-quiet my-6 bg-white/[0.02] py-3 pr-4 rounded-r-lg">
        {children}
      </blockquote>
    )
  },
  hr() {
    return <hr className="border-0 border-t border-white/[0.06] my-10" />
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code(props: any) {
    const { children, className } = props
    const isBlock = Boolean(className)
    if (isBlock) {
      return (
        <pre className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-4 overflow-x-auto my-6">
          <code className="text-quiet text-sm font-mono">{children}</code>
        </pre>
      )
    }
    return (
      <code className="font-mono text-sm bg-white/[0.06] text-flame px-1.5 py-0.5 rounded">
        {children}
      </code>
    )
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-6">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    )
  },
  th({ children }) {
    return (
      <th className="text-left px-4 py-2 text-quiet font-semibold border-b border-white/[0.08] bg-white/[0.03]">
        {children}
      </th>
    )
  },
  td({ children }) {
    return (
      <td className="px-4 py-2 text-quiet border-b border-white/[0.04]">
        {children}
      </td>
    )
  },
  // Images render as figure with figcaption — alt text becomes the caption
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  img(props: any) {
    const { src, alt } = props
    if (!src) return null
    return (
      <figure className="my-8">
        <img
          src={src}
          alt={alt ?? ''}
          className="w-full rounded-lg object-cover"
          style={{ maxHeight: '480px' }}
          loading="lazy"
        />
        {alt && (
          <figcaption className="text-sm text-whisper mt-2 text-center">
            {alt}
          </figcaption>
        )}
      </figure>
    )
  },
}

interface ArticleMarkdownProps {
  content: string
  stripFaq?: boolean
  className?: string
}

export function ArticleMarkdown({ content, stripFaq = true, className }: ArticleMarkdownProps) {
  const processed = stripFaq ? stripFaqSection(content) : content

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}
