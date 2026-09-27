import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export function Modal({
  title,
  onClose,
  children,
  wide,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Luk">
            <Icon name="x" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

let showConfirm: ((r: ConfirmRequest) => void) | null = null;

/**
 * In-page replacement for window.confirm (which some embedded viewers block).
 * Resolves true when the user confirms.
 */
export function confirmAction(
  message: string,
  { confirmLabel = 'Fortsæt', danger = true }: { confirmLabel?: string; danger?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!showConfirm) return resolve(window.confirm(message));
    showConfirm({ message, confirmLabel, danger, resolve });
  });
}

/** Mount once near the app root. */
export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  useEffect(() => {
    showConfirm = setReq;
    return () => {
      showConfirm = null;
    };
  }, []);
  if (!req) return null;
  const close = (ok: boolean) => {
    req.resolve(ok);
    setReq(null);
  };
  return (
    <Modal
      title="Er du sikker?"
      onClose={() => close(false)}
      footer={
        <>
          <span />
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => close(false)}>
              Annuller
            </button>
            <button className={`btn ${req.danger ? 'btn-danger' : 'btn-primary'}`} autoFocus onClick={() => close(true)}>
              {req.confirmLabel}
            </button>
          </div>
        </>
      }
    >
      <p>{req.message}</p>
    </Modal>
  );
}
