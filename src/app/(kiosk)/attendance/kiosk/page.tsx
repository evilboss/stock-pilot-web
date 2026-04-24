'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Wifi, WifiOff, CameraOff, Loader2 } from 'lucide-react';
import { attendanceApi, KioskScanResult, AttendanceEventType } from '@/lib/api/attendance';
import { cn } from '@/lib/utils';

// ── Config ─────────────────────────────────────────────────────────────────

const RETURN_TO_IDLE_MS = 4000;
const DUPLICATE_GUARD_MS = 10_000;
const SCANNER_FPS = 10;
const KIOSK_ID =
  typeof window !== 'undefined'
    ? (localStorage.getItem('kioskId') ?? 'kiosk-1')
    : 'kiosk-1';

// App palette — matches tailwind.config.ts primary + semantic colors
const PRIMARY = '#3C50E0';
const SUCCESS = '#16a34a';
const WARNING = '#d97706';
const DANGER  = '#dc2626';
const INFO    = '#0284c7';

// ── Types ──────────────────────────────────────────────────────────────────

type KioskPhase =
  | { phase: 'starting' }
  | { phase: 'idle' }
  | { phase: 'processing' }
  | { phase: 'success'; result: KioskScanResult }
  | { phase: 'error'; message: string }
  | { phase: 'camera-error'; message: string };

const ACTION_LABEL: Record<AttendanceEventType, string> = {
  CLOCK_IN:  'Checked In',
  CLOCK_OUT: 'Checked Out',
  LUNCH_OUT: 'On Lunch Break',
  LUNCH_IN:  'Back from Lunch',
};

const ACTION_COLOR: Record<AttendanceEventType, string> = {
  CLOCK_IN:  SUCCESS,
  CLOCK_OUT: PRIMARY,
  LUNCH_OUT: WARNING,
  LUNCH_IN:  INFO,
};

const ACTION_MESSAGE: Record<AttendanceEventType, string> = {
  CLOCK_IN:  'Have a great shift!',
  CLOCK_OUT: 'See you next time!',
  LUNCH_OUT: 'Enjoy your break!',
  LUNCH_IN:  'Welcome back!',
};

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

// ── Main component ─────────────────────────────────────────────────────────

export default function KioskPage() {
  const [state, setState] = useState<KioskPhase>({ phase: 'starting' });
  const [online, setOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const recentScans    = useRef<Map<string, number>>(new Map());
  const processingRef  = useRef(false);
  const returnTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const scannerRef     = useRef<any>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const scheduleReturn = useCallback(() => {
    clearTimeout(returnTimerRef.current);
    returnTimerRef.current = setTimeout(() => {
      processingRef.current = false;
      setState({ phase: 'idle' });
    }, RETURN_TO_IDLE_MS);
  }, []);

  const processToken = useCallback(async (token: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setState({ phase: 'processing' });

    try {
      const result = await attendanceApi.kioskScan(token, KIOSK_ID);

      const empId = result.employee.id;
      const lastScan = recentScans.current.get(empId);
      if (lastScan && Date.now() - lastScan < DUPLICATE_GUARD_MS) {
        setState({ phase: 'error', message: 'Already scanned recently. Please wait a moment before scanning again.' });
        scheduleReturn();
        return;
      }
      recentScans.current.set(empId, Date.now());
      setState({ phase: 'success', result });
    } catch (err: any) {
      setState({
        phase: 'error',
        message: err?.response?.data?.message ?? 'Something went wrong. Please try again or see the front desk.',
      });
    }

    scheduleReturn();
  }, [scheduleReturn]);

  useEffect(() => {
    let stopped = false;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (stopped) return;

        const scanner = new Html5Qrcode('qr-reader', { verbose: false });
        scannerRef.current = scanner;

        // Camera container is 80% of the body area; scan box is 72% of that
        const headerH = 60;
        const cameraW = window.innerWidth * 0.8;
        const cameraH = (window.innerHeight - headerH) * 0.8;
        const size = Math.round(Math.min(cameraW, cameraH) * 0.72);

        await scanner.start(
          { facingMode: 'environment' },
          { fps: SCANNER_FPS, qrbox: { width: size, height: size } },
          (decoded) => { processToken(decoded); },
          () => {},
        );

        if (!stopped) setState({ phase: 'idle' });
      } catch (err: any) {
        if (stopped) return;
        const msg = err?.message?.toLowerCase().includes('permission')
          ? 'Camera permission denied. Please allow camera access and reload the page.'
          : err?.message?.includes('NotFound') || err?.message?.includes('no camera')
          ? 'No camera was found on this device.'
          : `Camera error: ${err?.message ?? 'unknown'}`;
        setState({ phase: 'camera-error', message: msg });
      }
    };

    startScanner();

    return () => {
      stopped = true;
      clearTimeout(returnTimerRef.current);
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [processToken]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan { 0%,100% { top: 14%; } 50% { top: 78%; } }
        @keyframes kiosk-in { from { opacity:0; transform:translateY(10px) scale(.97); } to { opacity:1; transform:none; } }
        .scan-line { animation: scan 2.6s ease-in-out infinite; }
        .kiosk-in  { animation: kiosk-in .22s ease-out forwards; }
        #qr-reader video { object-fit:cover !important; width:100% !important; height:100% !important; }
        #qr-reader img   { display:none !important; }
        #qr-reader > div:last-child { display:none !important; }
      ` }} />

      <div className="h-screen flex flex-col select-none overflow-hidden">

        {/* ── Compact header ────────────────────────────────────────────────── */}
        <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0 z-10">
          <div className="flex items-center justify-between px-8 py-3">

            {/* Brand */}
            <div className="flex items-center gap-2.5 min-w-[160px]">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[11px] font-extrabold flex-shrink-0"
                style={{ backgroundColor: PRIMARY }}
              >
                SP
              </div>
              <div className="leading-none">
                <p className="text-sm font-semibold text-gray-800">StockPilot</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Attendance Kiosk</p>
              </div>
            </div>

            {/* Clock */}
            <div className="text-center">
              <div className="text-3xl font-bold tabular-nums leading-none" style={{ color: PRIMARY }}>
                {currentTime ? format(currentTime, 'hh:mm') : '--:--'}
                <span className="text-xl text-gray-400 ml-1">{currentTime ? format(currentTime, 'ss') : '--'}</span>
                <span className="text-lg text-gray-400 ml-2">{currentTime ? format(currentTime, 'a') : ''}</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {currentTime ? format(currentTime, 'EEEE, MMMM d, yyyy') : ''}
              </p>
            </div>

            {/* Online status */}
            <div className="min-w-[160px] flex justify-end">
              {online ? (
                <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                  <Wifi className="w-4 h-4" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-500 text-sm font-medium">
                  <WifiOff className="w-4 h-4" /> Offline
                </span>
              )}
            </div>
          </div>
        </header>

        {/* ── Body — light background with centred camera card ─────────────── */}
        <div className="flex-1 min-h-0 bg-gray-100 flex items-center justify-center p-6">
        <div className="relative w-4/5 h-4/5 rounded-2xl overflow-hidden bg-gray-900 shadow-2xl border border-gray-700">

          {/* Camera feed — pinned to fill the container */}
          <div id="qr-reader" className="absolute inset-0 w-full h-full" />

          {/* Top card — greeting (idle / starting) */}
          {(state.phase === 'idle' || state.phase === 'starting') && (
            <div className="absolute top-5 inset-x-0 flex justify-center pointer-events-none z-10 px-6">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-8 py-4 text-center shadow-lg">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70 mb-1">
                  {currentTime ? greeting(currentTime) : ''}
                </p>
                <h1 className="text-2xl font-bold text-white drop-shadow">
                  Scan your badge to record attendance
                </h1>
              </div>
            </div>
          )}

          {/* Top card — processing text */}
          {state.phase === 'processing' && (
            <div className="absolute top-5 inset-x-0 flex justify-center pointer-events-none z-10 px-6">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-8 py-4 text-center shadow-lg">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70 mb-1">Processing</p>
                <h1 className="text-2xl font-bold text-white drop-shadow">Verifying your badge…</h1>
              </div>
            </div>
          )}

          {/* Animated scan line — scoped to the central ~70% zone */}
          {state.phase === 'idle' && (
            <div
              className="scan-line absolute inset-x-[14%] h-px pointer-events-none z-10"
              style={{ backgroundColor: PRIMARY, boxShadow: `0 0 6px 1px ${PRIMARY}66` }}
            />
          )}

          {/* Corner brackets marking the scan zone */}
          {state.phase === 'idle' && <ScanZoneCorners color={PRIMARY} />}

          {/* Bottom card — hint */}
          {state.phase === 'idle' && (
            <div className="absolute bottom-5 inset-x-0 flex justify-center pointer-events-none z-10 px-6">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-6 py-2.5 shadow">
                <p className="text-sm text-white/70">Hold your personal QR code up to the camera</p>
              </div>
            </div>
          )}

          {/* Starting spinner */}
          {state.phase === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-4 z-10">
              <Loader2 className="w-12 h-12 animate-spin" style={{ color: PRIMARY }} />
              <p className="text-gray-400 text-sm">Starting camera…</p>
            </div>
          )}

          {/* Processing spinner overlay */}
          {state.phase === 'processing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
              <div
                className="w-16 h-16 rounded-full border-4 border-white/20 animate-spin"
                style={{ borderTopColor: PRIMARY }}
              />
            </div>
          )}

          {/* Camera error */}
          {state.phase === 'camera-error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-5 px-8 z-10">
              <div className="w-16 h-16 rounded-full bg-red-900/40 flex items-center justify-center">
                <CameraOff className="w-8 h-8 text-red-400" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">Camera Unavailable</h2>
                <p className="text-gray-400 text-sm mt-2 max-w-sm">{state.message}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: PRIMARY }}
              >
                Reload Page
              </button>
            </div>
          )}
        </div>{/* camera card */}
        </div>{/* body */}

        {/* ── Success overlay ───────────────────────────────────────────────── */}
        {state.phase === 'success' && (() => {
          const color = ACTION_COLOR[state.result.actionPerformed];
          const label = ACTION_LABEL[state.result.actionPerformed];
          const msg   = ACTION_MESSAGE[state.result.actionPerformed];
          const emp   = state.result.employee;
          return (
            <div className="fixed inset-0 z-20 bg-white flex flex-col kiosk-in">
              <div className="h-1.5 w-full flex-shrink-0" style={{ backgroundColor: color }} />
              <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8">
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-lg"
                  style={{ backgroundColor: color }}
                >
                  {initials(emp.firstName, emp.lastName)}
                </div>
                <span
                  className="text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full text-white"
                  style={{ backgroundColor: color }}
                >
                  {label}
                </span>
                <div className="text-center">
                  <h1 className="text-5xl font-bold text-gray-800">
                    {emp.firstName} {emp.lastName}
                  </h1>
                  <p className="text-gray-400 text-xl tabular-nums mt-2">
                    {format(new Date(state.result.timestamp), 'hh:mm:ss a')}
                  </p>
                </div>
                <CheckCircle2 className="w-10 h-10 mt-1" style={{ color }} />
                <p className="text-gray-500 text-base font-medium">{msg}</p>
                <Countdown ms={RETURN_TO_IDLE_MS} />
              </div>
            </div>
          );
        })()}

        {/* ── Error overlay ─────────────────────────────────────────────────── */}
        {state.phase === 'error' && (
          <div className="fixed inset-0 z-20 bg-white flex flex-col kiosk-in">
            <div className="h-1.5 w-full flex-shrink-0" style={{ backgroundColor: DANGER }} />
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle className="w-10 h-10" style={{ color: DANGER }} />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800">Scan failed</h2>
                <p className="text-gray-500 mt-2 max-w-sm">{state.message}</p>
              </div>
              <Countdown ms={RETURN_TO_IDLE_MS} />
            </div>
          </div>
        )}

        {/* Kiosk ID watermark */}
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 text-white/20 text-[11px] z-10 pointer-events-none">
          {KIOSK_ID}
        </div>
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

// Corner brackets positioned to mark the centered 72% scan zone
function ScanZoneCorners({ color }: { color: string }) {
  const corners = [
    { top: '14%', left: '14%', cls: 'border-t-2 border-l-2 rounded-tl-md' },
    { top: '14%', right: '14%', cls: 'border-t-2 border-r-2 rounded-tr-md' },
    { bottom: '14%', left: '14%', cls: 'border-b-2 border-l-2 rounded-bl-md' },
    { bottom: '14%', right: '14%', cls: 'border-b-2 border-r-2 rounded-br-md' },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <span
          key={i}
          className={cn('absolute w-8 h-8 pointer-events-none z-10', c.cls)}
          style={{ borderColor: color, top: c.top, left: c.left, right: c.right, bottom: c.bottom }}
        />
      ))}
    </>
  );
}

function Countdown({ ms }: { ms: number }) {
  const [secs, setSecs] = useState(Math.ceil(ms / 1000));
  useEffect(() => {
    if (secs <= 0) return;
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secs]);
  return (
    <p className="text-sm text-gray-300 mt-4">
      Returning in {secs}s…
    </p>
  );
}
