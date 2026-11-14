const ICONS = {
  alert: <><path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.5L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  "arrow-left": <><path d="m15 18-6-6 6-6" /><path d="M20 12H9" /></>,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  flask: <><path d="M9 3h6M10 3v6.5L4.5 19a1.8 1.8 0 0 0 1.5 2.8h12a1.8 1.8 0 0 0 1.5-2.8L14 9.5V3" /><path d="M7 16h10" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  hospital: <><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 21v-4h6v4" /><path d="M10 7h4M12 5v4M9 12h.01M15 12h.01" /></>,
  lock: <><rect x="4" y="11" width="16" height="11" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4M12 15v3" /></>,
  "log-out": <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>,
  stethoscope: <><path d="M6 3v5a6 6 0 0 0 12 0V3M4 3h4M16 3h4M12 14v2a4 4 0 0 0 8 0v-1" /><circle cx="20" cy="13" r="1" /><circle cx="12" cy="20" r="2" /></>,
  user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="8" r="5" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></>,
  "file-text": <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
};

export default function Icon({ name, size = 18, className = "" }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return <svg aria-hidden="true" className={`inline-block shrink-0 ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>;
}
