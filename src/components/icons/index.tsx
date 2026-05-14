interface IconProps {
  size?: number;
}

export const IconArrowUp = ({ size = 8 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
    <path d="M5 2.5L8.5 7H1.5L5 2.5z" fill="currentColor" />
  </svg>
);

export const IconArrowDown = ({ size = 8 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
    <path d="M5 7.5L1.5 3H8.5L5 7.5z" fill="currentColor" />
  </svg>
);

export const IconDash = ({ size = 8 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
    <rect x="2" y="4.4" width="6" height="1.2" rx="0.6" fill="currentColor" />
  </svg>
);

export const IconChevron = ({ size = 10 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
    <path
      d="M3.5 1.5L7 5L3.5 8.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconSearch = ({ size = 13 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
    <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M9 9L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconExternal = ({ size = 10 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
    <path
      d="M3 1H1V9H9V7M5.5 1H9V4.5M9 1L4.5 5.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export const IconSurge = ({ size = 9 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
    <path d="M5 1L2 5h2v4h2V5h2z" fill="currentColor" />
  </svg>
);
