import { useEffect } from 'react';
import Icon from './Icon';

export default function ConfirmModal({
  open,
  title = 'Confirm action',
  description = 'Are you sure you want to continue?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    if (!open) return undefined;

    function handleEscape(event) {
      if (event.key === 'Escape') onClose?.();
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const confirmClass = tone === 'danger' ? 'btn-secondary' : 'btn-primary';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-[30px] border border-nanny-orange/15 bg-white p-6 shadow-[0_32px_80px_rgba(72,44,16,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nanny-orange/10 text-nanny-orange">
              <Icon name="close" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-bold text-nanny-deepOrange">{title}</p>
              <p className="mt-2 text-sm leading-6 text-nanny-brownish/75">{description}</p>
            </div>
          </div>
          <button type="button" className="text-nanny-brownish/45 transition hover:text-nanny-brownish" onClick={onClose}>
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            {cancelLabel}
          </button>
          <button type="button" className={`${confirmClass} flex-1`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
