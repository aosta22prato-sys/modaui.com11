import clsx from 'clsx';

export interface ModalProps {
  open?: boolean;
  onClose?: () => void;
  className?: string;
  overlayClassName?: string;
  children: React.ReactNode;
}

export function Modal({ open = true, onClose, className, overlayClassName, children }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4',
        overlayClassName
      )}
      onClick={onClose}
    >
      <div className={clsx('max-w-lg w-full', className)} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
