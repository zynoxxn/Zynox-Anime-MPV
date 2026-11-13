import React, { useState } from 'react';
import { Copy, Check, Clipboard } from 'lucide-react';

interface AdminCopyInputProps {
  value: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  type?: 'text' | 'url';
  label?: string;
  helperText?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  showPaste?: boolean;
}

export const AdminCopyInput: React.FC<AdminCopyInputProps> = ({
  value,
  onChange,
  placeholder,
  readOnly = false,
  type = 'text',
  label,
  helperText,
  className = '',
  inputClassName = '',
  autoFocus = false,
  showPaste = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaste = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const text = await navigator.clipboard?.readText();
      if (text && onChange) {
        onChange(text);
        setPasted(true);
        setTimeout(() => setPasted(false), 1500);
      }
    } catch {
      // Clipboard permissions denied
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-white">
          {label}
        </label>
      )}
      <div className="relative flex items-center min-w-0">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          autoFocus={autoFocus}
          className={`w-full h-11 bg-[#101A30] border border-white/10 hover:border-white/15 focus:border-[#1E88FF] focus:ring-1 focus:ring-[#1E88FF] rounded-[10px] pl-3.5 pr-10 text-[13px] font-mono text-white placeholder-[#64748B] outline-none overflow-x-auto whitespace-nowrap transition-colors ${inputClassName}`}
        />
        {value ? (
          <button
            type="button"
            onClick={handleCopy}
            className="w-8 h-8 rounded-lg hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center absolute right-1.5 transition-colors cursor-pointer shrink-0"
            title={copied ? 'Copied!' : 'Copy to clipboard'}
            aria-label="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        ) : showPaste ? (
          <button
            type="button"
            onClick={handlePaste}
            className="w-8 h-8 rounded-lg hover:bg-white/10 text-[#94A3B8] hover:text-[#1E88FF] flex items-center justify-center absolute right-1.5 transition-colors cursor-pointer shrink-0"
            title={pasted ? 'Pasted!' : 'Paste from clipboard'}
            aria-label="Paste from clipboard"
          >
            {pasted ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Clipboard className="w-3.5 h-3.5" />
            )}
          </button>
        ) : null}
      </div>
      {helperText && (
        <p className="text-xs text-[#94A3B8]">{helperText}</p>
      )}
    </div>
  );
};
