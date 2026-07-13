interface Props {
  src: string
  alt: string
  caption?: string
  className?: string
  priority?: boolean
}

export function RockstarImage({ src, alt, caption, className, priority }: Props) {
  return (
    <figure className={`relative overflow-hidden ${className ?? ''}`}>
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        className="w-full h-full object-cover"
        style={{ background: '#1a1a1a' }}
      />
      <span className="absolute bottom-1 right-2 text-[8px] text-white/50 select-none pointer-events-none">
        © Rockstar Games
      </span>
      {caption && (
        <figcaption className="text-xs text-center text-gray-400 italic mt-1 px-2 pb-1">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
