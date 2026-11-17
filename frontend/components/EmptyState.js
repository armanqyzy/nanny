import Link from 'next/link';

// Friendly "nothing here yet" block: mascot, short explanation and the next step to take.
export default function EmptyState({ title, text, actionLabel, actionHref, onAction, compact = false }) {
  return (
    <div className={`flex flex-col items-center rounded-[28px] border border-dashed border-nanny-orange/25 bg-white/80 text-center ${compact ? 'px-4 py-6' : 'px-6 py-10'}`}>
      <img src="/pet-placeholder.png" alt="" aria-hidden="true" className={`${compact ? 'h-16 w-16' : 'h-24 w-24'} object-contain`} />
      {title && <p className={`mt-3 font-bold text-nanny-deepOrange ${compact ? 'text-base' : 'text-lg'}`}>{title}</p>}
      {text && <p className="mt-1 max-w-md text-sm leading-6 text-nanny-brownish/70">{text}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary mt-4 text-sm">{actionLabel}</Link>
      )}
      {actionLabel && !actionHref && onAction && (
        <button type="button" onClick={onAction} className="btn-primary mt-4 text-sm">{actionLabel}</button>
      )}
    </div>
  );
}
