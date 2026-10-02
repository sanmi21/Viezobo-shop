import Link from 'next/link'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="VieZobo home">
      <span
        className={`${compact ? 'size-9 text-[9px]' : 'size-10 text-[10px]'} flex items-center justify-center rounded-full bg-[#b70b4c] font-black leading-3 text-white`}
      >
        VIE
        <br />
        ZOBO
      </span>
      {!compact && (
        <span className="hidden text-[10px] font-bold uppercase tracking-[0.17em] text-[#b70b4c] sm:block">
          Joy
          <br />
          in a bottle
        </span>
      )}
    </Link>
  )
}
