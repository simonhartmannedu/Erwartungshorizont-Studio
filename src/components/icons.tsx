type IconProps = {
  className?: string;
};

export const DashboardIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M4 5.5h16M4 12h16M4 18.5h16" strokeLinecap="round" />
    <path d="M7 4v15.5M17 4v15.5" strokeLinecap="round" />
  </svg>
);

export const DragIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <circle cx="8" cy="7" r="1.4" />
    <circle cx="8" cy="12" r="1.4" />
    <circle cx="8" cy="17" r="1.4" />
    <circle cx="16" cy="7" r="1.4" />
    <circle cx="16" cy="12" r="1.4" />
    <circle cx="16" cy="17" r="1.4" />
  </svg>
);

export const GradesIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M5 19V9m7 10V5m7 14v-7" strokeLinecap="round" />
    <path d="M3.5 19.5h17" strokeLinecap="round" />
  </svg>
);

export const ReportIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z" strokeLinejoin="round" />
    <path d="M14 3.5V8h4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12h6M9 16h6" strokeLinecap="round" />
  </svg>
);

export const ArchiveIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M4.5 6.5h15v3h-15z" strokeLinejoin="round" />
    <path d="M6.5 9.5h11V18A1.5 1.5 0 0 1 16 19.5H8A1.5 1.5 0 0 1 6.5 18V9.5Z" strokeLinejoin="round" />
    <path d="M10 13h4" strokeLinecap="round" />
  </svg>
);

export const DownloadIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M12 4.5v10" strokeLinecap="round" />
    <path d="m8.5 11.5 3.5 3.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 19.5h14" strokeLinecap="round" />
  </svg>
);

export const UploadIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M12 19.5v-10" strokeLinecap="round" />
    <path d="m8.5 12.5 3.5-3.5 3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 19.5h14" strokeLinecap="round" />
  </svg>
);

export const DuplicateIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <rect x="9" y="9" width="10" height="10" rx="1.5" />
    <path d="M6 15.5H5.5A1.5 1.5 0 0 1 4 14V5.5A1.5 1.5 0 0 1 5.5 4H14A1.5 1.5 0 0 1 15.5 5.5V6" strokeLinecap="round" />
  </svg>
);

export const OpenIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M14 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 14 19 5" strokeLinecap="round" />
    <path d="M19 13v4.5A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-11A1.5 1.5 0 0 1 6.5 5H11" strokeLinecap="round" />
  </svg>
);

export const TrashIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M4.5 7.5h15" strokeLinecap="round" />
    <path d="M9.5 4.5h5" strokeLinecap="round" />
    <path d="M7 7.5 8 18a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 16 18l1-10.5" strokeLinejoin="round" />
  </svg>
);

export const PlusIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);

export const MinusIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M5 12h14" strokeLinecap="round" />
  </svg>
);

export const CheckIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
    <path d="m5.5 12.5 4 4 9-9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CloseIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
  </svg>
);

export const MoonIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M18 15.5A7.5 7.5 0 0 1 8.5 6a7.5 7.5 0 1 0 9.5 9.5Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SunIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3" strokeLinecap="round" />
  </svg>
);

export const LockIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <rect x="5" y="10" width="14" height="10" rx="2" />
    <path d="M8 10V7.5A4 4 0 0 1 12 3.5a4 4 0 0 1 4 4V10" strokeLinecap="round" />
  </svg>
);

export const UnlockIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <rect x="5" y="10" width="14" height="10" rx="2" />
    <path d="M9 10V7.5A4 4 0 0 1 16 5" strokeLinecap="round" />
  </svg>
);

export const KeyIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <circle cx="8" cy="12" r="3.5" />
    <path d="M11.5 12H20M16 12v3M18.5 12v2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const UserIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 19a7 7 0 0 1 14 0" strokeLinecap="round" />
  </svg>
);

export const EyeIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);

export const EyeOffIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M3 3 21 21" strokeLinecap="round" />
    <path d="M10.6 6.2A10.1 10.1 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.1 3.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.2 6.8A16.8 16.8 0 0 0 2.5 12s3.5 6 9.5 6c1.7 0 3.3-.5 4.6-1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" strokeLinecap="round" />
  </svg>
);

export const GroupIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <circle cx="9" cy="8.5" r="2.5" />
    <circle cx="16.5" cy="9.5" r="2" />
    <path d="M4.5 18a5 5 0 0 1 9 0" strokeLinecap="round" />
    <path d="M13.5 18a4 4 0 0 1 6 0" strokeLinecap="round" />
  </svg>
);

export const SaveIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M5.5 4.5h10l3 3V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4.5 19V6A1.5 1.5 0 0 1 6 4.5Z" strokeLinejoin="round" />
    <path d="M8 4.5v5h7v-5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.5 15.5h7" strokeLinecap="round" />
  </svg>
);

export const ChevronDownIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="m6.5 9.5 5.5 5 5.5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronRightIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="m9.5 6.5 5 5.5-5 5.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LinkIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M10 8.5H8a4 4 0 0 0 0 8h2.5" strokeLinecap="round" />
    <path d="M14 15.5H16a4 4 0 0 0 0-8h-2.5" strokeLinecap="round" />
    <path d="M9 12h6" strokeLinecap="round" />
  </svg>
);

export const UnlinkIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M10 8.5H8a4 4 0 0 0 0 8h2.5" strokeLinecap="round" />
    <path d="M14 15.5H16a4 4 0 0 0 0-8h-2.5" strokeLinecap="round" />
    <path d="M4.5 19.5 19.5 4.5" strokeLinecap="round" />
  </svg>
);

export const PencilIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="m4.5 16.5 9.8-9.8a2.1 2.1 0 0 1 3 0l.1.1a2.1 2.1 0 0 1 0 3L7.5 19.5 4 20Z" strokeLinejoin="round" />
    <path d="m13 8 3 3" strokeLinecap="round" />
  </svg>
);

export const TemplateIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <rect x="4.5" y="4.5" width="15" height="15" rx="2" />
    <path d="M8 9h8M8 13h4M8 16h6" strokeLinecap="round" />
  </svg>
);

export const ListIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <circle cx="6.5" cy="7" r="1" fill="currentColor" stroke="none" />
    <circle cx="6.5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="6.5" cy="17" r="1" fill="currentColor" stroke="none" />
    <path d="M10 7h8M10 12h8M10 17h8" strokeLinecap="round" />
  </svg>
);

export const CompactIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M5 8h4M15 8h4M9 8h2" strokeLinecap="round" />
    <path d="M13 8h0.5" strokeLinecap="round" />
    <path d="M5 16h4M15 16h4M9 16h2" strokeLinecap="round" />
    <path d="M13 16h0.5" strokeLinecap="round" />
  </svg>
);

export const ReplaceIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M7 7.5h10" strokeLinecap="round" />
    <path d="M7 12h10" strokeLinecap="round" />
    <path d="M7 16.5h6" strokeLinecap="round" />
    <path d="m14.5 14 3 2.5-3 2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PercentIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M7 17 17 7" strokeLinecap="round" />
    <circle cx="8" cy="8" r="2" />
    <circle cx="16" cy="16" r="2" />
  </svg>
);

export const InfoIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 10.5v5" strokeLinecap="round" />
    <circle cx="12" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const WarningIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M12 4.5 20 19H4l8-14.5Z" strokeLinejoin="round" />
    <path d="M12 9v4.5" strokeLinecap="round" />
    <circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const PaletteIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path
      d="M12 4.5c-4.7 0-8.5 3.6-8.5 8 0 3.9 2.9 7 6.5 7h1.2c1 0 1.8-.8 1.8-1.8 0-.6-.3-1.1-.7-1.5-.3-.3-.5-.7-.5-1.1 0-1 .8-1.8 1.8-1.8h1.3c3 0 5.6-2.4 5.6-5.5 0-4.3-3.8-7.8-8.5-7.8Z"
      strokeLinejoin="round"
    />
    <circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const CupIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M6 8.5h10v4.5A4.5 4.5 0 0 1 11.5 17.5h-1A4.5 4.5 0 0 1 6 13V8.5Z" strokeLinejoin="round" />
    <path d="M16 9h1.2a2.3 2.3 0 0 1 0 4.6H16" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 4.5v2.2M11 3.8v2.9M14 4.5v2.2" strokeLinecap="round" />
    <path d="M7 19.5h9" strokeLinecap="round" />
  </svg>
);
