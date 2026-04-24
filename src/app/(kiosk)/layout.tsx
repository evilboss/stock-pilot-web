import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Attendance Kiosk — StockPilot',
};

// Bare full-screen layout: no nav, no header, no auth redirect.
// Auth is handled per-page (kiosk uses QR token; my-qr has its own login flow).
export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
