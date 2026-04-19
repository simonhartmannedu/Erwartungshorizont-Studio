import { KeyboardEvent, ReactNode, useEffect, useState } from "react";
import { CheckIcon, CloseIcon, InfoIcon } from "./icons";

export const Card = ({
  title,
  subtitle,
  actions,
  children,
  className = "",
  headerLayout = "split",
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headerLayout?: "split" | "stacked";
}) => (
  <section className={`panel p-4 sm:p-6 ${className}`}>
    {(title || actions) && (
      <div
        className={`mb-5 ${
          headerLayout === "stacked"
            ? "space-y-3"
            : "flex flex-wrap items-start justify-between gap-3"
        }`}
      >
        <div>
          {title && <h2 className="card-title text-lg font-semibold">{title}</h2>}
          {subtitle && <p className="card-subtitle mt-1 text-sm">{subtitle}</p>}
        </div>
        {actions}
      </div>
    )}
    {children}
  </section>
);

export const Field = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <label className="block">
    <span className="label">{label}</span>
    {children}
  </label>
);

const formatEditableNumber = (value: number) => {
  if (!Number.isFinite(value)) return "";
  return Number.isInteger(value) ? String(value) : String(value).replace(/\.0$/, "");
};

const snapToStep = (value: number, step: number) => {
  const safeStep = step > 0 ? step : 1;
  return Math.round(value / safeStep) * safeStep;
};

export const NumberInput = ({
  value,
  onCommit,
  min,
  step = 1,
  className = "",
  placeholder,
}: {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  step?: number;
  className?: string;
  placeholder?: string;
}) => {
  const [draft, setDraft] = useState(() => formatEditableNumber(value));

  useEffect(() => {
    setDraft(formatEditableNumber(value));
  }, [value]);

  const commit = () => {
    const normalized = draft.replace(",", ".").trim();
    if (!normalized) {
      setDraft(formatEditableNumber(value));
      return;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      setDraft(formatEditableNumber(value));
      return;
    }

    const snapped = snapToStep(parsed, step);
    const clamped = min !== undefined ? Math.max(min, snapped) : snapped;
    onCommit(clamped);
    setDraft(formatEditableNumber(clamped));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
};

export const IconButton = ({
  children,
  onClick,
  title,
  variant = "secondary",
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  variant?: "secondary" | "soft";
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`${variant === "soft" ? "button-soft gap-2" : "button-secondary gap-2"} ${className}`}
  >
    {children}
  </button>
);

export const Badge = ({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "amber" | "rose" | "emerald";
}) => {
  const tones = {
    slate: "badge-slate",
    amber: "badge-amber",
    rose: "badge-rose",
    emerald: "badge-emerald",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
};

export const DismissibleCallout = ({
  children,
  tone = "info",
  defaultVisible = true,
  resetKey,
}: {
  children: ReactNode;
  tone?: "info" | "warning" | "success" | "danger";
  defaultVisible?: boolean;
  resetKey?: string | number;
}) => {
  const [visible, setVisible] = useState(defaultVisible);

  useEffect(() => {
    setVisible(defaultVisible);
  }, [defaultVisible, resetKey]);

  if (!visible) return null;

  return (
    <div className={`callout ${
      tone === "danger"
        ? "callout-danger"
        : tone === "warning"
          ? "callout-warning"
          : tone === "success"
            ? "callout-success"
            : "callout-info"
    }`}>
      <div className="flex items-start gap-3">
        <span className="callout-icon">
          {tone === "success" ? (
            <CheckIcon className="h-4 w-4" />
          ) : tone === "danger" ? (
            <CloseIcon className="h-4 w-4" />
          ) : (
            <InfoIcon className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1 text-sm leading-6">{children}</div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          title="Hinweis ausblenden"
          className="callout-close"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
