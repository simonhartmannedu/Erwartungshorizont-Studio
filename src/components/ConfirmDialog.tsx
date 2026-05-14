import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArchiveIcon, CheckIcon, CloseIcon } from "./icons";

interface Props {
  open: boolean;
  title: string;
  description: string;
  children?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  onSaveAndConfirm?: () => void;
  confirmLabel: string;
  cancelDisabled?: boolean;
  confirmDisabled?: boolean;
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  children,
  onCancel,
  onConfirm,
  onSaveAndConfirm,
  confirmLabel,
  cancelDisabled = false,
  confirmDisabled = false,
}: Props) => {
  if (!open) return null;

  const dialog = (
    <div className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="dialog-panel panel w-full max-w-xl border p-6">
        <h2 className="dialog-title text-xl font-semibold">{title}</h2>
        <p className="dialog-description mt-3 whitespace-pre-line text-sm leading-6">{description}</p>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" className="button-secondary gap-2" onClick={onCancel} disabled={cancelDisabled}>
            <CloseIcon />
            Abbrechen
          </button>
          {onSaveAndConfirm && (
            <button type="button" className="button-secondary gap-2" onClick={onSaveAndConfirm} disabled={confirmDisabled}>
              <ArchiveIcon />
              Vorher speichern
            </button>
          )}
          <button type="button" className="button-primary gap-2" onClick={onConfirm} disabled={confirmDisabled}>
            <CheckIcon />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return dialog;
  }

  return createPortal(dialog, document.fullscreenElement ?? document.body);
};
