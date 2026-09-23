const ICONS = {
  logo: (
    <>
      <path d="M12 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path d="M5 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M19 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M8.5 22c-2.8 0-4.5-2.3-4.5-4.2 0-2.3 2-3.8 4.1-3.8 1.7 0 2.7.9 3.9.9s2.2-.9 3.9-.9c2.1 0 4.1 1.5 4.1 3.8 0 1.9-1.7 4.2-4.5 4.2-1.5 0-2.2-.6-3.5-.6s-2 .6-3.5.6Z" />
    </>
  ),
  home: <path d="M3 10.5 12 3l9 7.5v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" />,
  chat: (
    <>
      <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    </>
  ),
  calendar: (
    <>
      <path d="M7 2v3M17 2v3M4 7h16" />
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5l3 2" />
    </>
  ),
  pet: <path d="M12 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM5 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8.5 22c-2.8 0-4.5-2.3-4.5-4.2 0-2.3 2-3.8 4.1-3.8 1.7 0 2.7.9 3.9.9s2.2-.9 3.9-.9c2.1 0 4.1 1.5 4.1 3.8 0 1.9-1.7 4.2-4.5 4.2-1.5 0-2.2-.6-3.5-.6s-2 .6-3.5.6Z" />,
  booking: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M8 11h8M8 15h5" />
    </>
  ),
  shop: (
    <>
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
      <path d="M3 4h2l2.3 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H7" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </>
  ),
  admin: (
    <>
      <path d="m12 3 7 3v5c0 4.2-2.8 8-7 10-4.2-2-7-5.8-7-10V6l7-3Z" />
      <path d="M9.5 12.5 11 14l3.5-4" />
    </>
  ),
  map: <path d="M9 18 4 20V6l5-2 6 2 5-2v14l-5 2-6-2Zm0 0V4m6 16V6" />,
  search: <path d="m21 21-4.2-4.2M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" />,
  bell: (
    <>
      <path d="M6 9.5a6 6 0 1 1 12 0c0 4.1 1.5 5.6 2 6H4c.5-.4 2-1.9 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  support: (
    <>
      <path d="M6 10a6 6 0 1 1 12 0c0 2.2-1 3.3-2.1 4.1-.8.6-1.4 1.1-1.4 2v.4H9.5v-.6c0-1.5 1-2.4 2-3.1 1-.7 1.8-1.3 1.8-2.8a1.8 1.8 0 0 0-3.6 0H6Z" />
      <circle cx="12" cy="20" r="1" />
    </>
  ),
  attach: (
    <>
      <path d="M16.5 6.5 9.4 13.6a3 3 0 1 0 4.2 4.2l6-6a5 5 0 1 0-7.1-7.1l-7 7a7 7 0 1 0 9.9 9.9l5.3-5.3" />
    </>
  ),
  microphone: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
    </>
  ),
  send: (
    <>
      <path d="M4 11.5 20 4l-4.5 16-3.3-6-6.2-2.5Z" />
      <path d="M20 4 12.2 14" />
    </>
  ),
  close: (
    <>
      <path d="M6 6 18 18M18 6 6 18" />
    </>
  ),
  check: <path d="M5 12.5 9.2 16.7 19 7" />,
  heart: (
    <>
      <path d="M12 20.5s-7-4.4-7-10.2A4.3 4.3 0 0 1 9.3 6c1.3 0 2.2.5 2.7 1.3.5-.8 1.4-1.3 2.7-1.3A4.3 4.3 0 0 1 19 10.3c0 5.8-7 10.2-7 10.2Z" />
    </>
  ),
  repeat: (
    <>
      <path d="M17 2v5h-5" />
      <path d="M7 22v-5h5" />
      <path d="M20 11a8 8 0 0 0-14.4-4L2 10" />
      <path d="M4 13a8 8 0 0 0 14.4 4L22 14" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M4 9h14.5A1.5 1.5 0 0 1 20 10.5v3A1.5 1.5 0 0 1 18.5 15H4" />
      <circle cx="16" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
};

export default function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.8, solid = false }) {
  const content = ICONS[name];
  if (!content) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={solid || name === 'logo' ? 'currentColor' : 'none'}
      stroke={solid || name === 'logo' ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}
