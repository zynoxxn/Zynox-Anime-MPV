import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message = 'Are you sure you want to delete this? This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDangerous = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        id="confirm-modal-box"
        className="w-full max-w-md bg-[#07111F] border border-white/[0.08] rounded-2xl p-6 shadow-2xl text-white"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            id="btn-confirm-cancel"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[#94A3B8] hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            id="btn-confirm-accept"
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-xl text-white transition-colors ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#1683FF] hover:bg-[#2196FF]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
