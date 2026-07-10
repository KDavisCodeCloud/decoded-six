import Image from 'next/image'

export function PalmSilhouette({
  className,
}: {
  className?: string
  opacity?: number
}) {
  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <Image
        src="/palm-sunset.png"
        alt=""
        fill
        priority
        sizes="45vw"
        className="object-cover object-center"
        aria-hidden="true"
      />
    </div>
  )
}
