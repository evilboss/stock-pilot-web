'use client';
import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Package,
  Eye,
  EyeOff,
  QrCode,
  RefreshCw,
  ArrowLeft,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { attendanceApi, EmployeeQrToken } from '@/lib/api/attendance';
import { setTokens, clearTokens, isAuthenticated } from '@/lib/auth';
import { format, parseISO, differenceInMinutes } from 'date-fns';

// ── Login form ─────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});
type LoginForm = z.infer<typeof loginSchema>;

function LoginStep({ onSuccess }: { onSuccess: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    try {
      const res = await authApi.login(data.email, data.password);
      setTokens(res.accessToken, res.refreshToken, res.user.id);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Login failed. Check your credentials.');
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
          <QrCode className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">My Attendance QR</h1>
        <p className="text-gray-500 text-sm mt-1">Sign in to view your personal QR code</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="form-label">Email</label>
          <input type="email" {...register('email')} className="form-input" placeholder="you@company.com" />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div>
          <label className="form-label">Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              {...register('password')}
              className="form-input pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn-primary py-3 flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Show My QR Code'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <a href="/login" className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to main login
        </a>
      </div>
    </div>
  );
}

// ── QR display ─────────────────────────────────────────────────────────────

function QrDisplay({
  tokenData,
  onRefresh,
  onBack,
  refreshing,
  sessionOwned,
}: {
  tokenData: EmployeeQrToken;
  onRefresh: () => void;
  onBack: () => void;
  refreshing: boolean;
  sessionOwned: boolean;
}) {
  const [minsLeft, setMinsLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      const left = differenceInMinutes(parseISO(tokenData.expiresAt), new Date());
      setMinsLeft(Math.max(0, left));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [tokenData.expiresAt]);

  const expiringSoon = minsLeft < 30;

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-6">
      <div className="text-center">
        <p className="text-gray-500 text-sm">Your personal attendance QR</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          {tokenData.employee.firstName} {tokenData.employee.lastName}
        </h1>
      </div>

      {/* QR code */}
      <div className="p-5 bg-white rounded-2xl shadow-lg border border-gray-100">
        {refreshing ? (
          <div className="w-56 h-56 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-gray-300 animate-spin" />
          </div>
        ) : (
          <QRCode value={tokenData.qrToken} size={224} />
        )}
      </div>

      {/* Expiry */}
      <div
        className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full ${
          expiringSoon ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-500'
        }`}
      >
        <Clock className="w-4 h-4 flex-shrink-0" />
        {minsLeft > 0
          ? `Expires in ${minsLeft >= 60 ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m` : `${minsLeft}m`}`
          : `Expired — please refresh`}
      </div>

      <p className="text-xs text-gray-400 text-center max-w-xs">
        Scan this code at the kiosk to clock in or out. Do not share it.
      </p>

      <div className="flex gap-3 w-full">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh QR
        </button>
        <button
          onClick={onBack}
          className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> {sessionOwned ? 'Sign Out' : 'Close'}
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MyQrPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tokenData, setTokenData] = useState<EmployeeQrToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Track whether this page created the session so we only clear tokens we own
  const sessionOwnedRef = useRef(false);

  const fetchQr = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await attendanceApi.getMyQr();
      setTokenData(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load QR code.');
    } finally {
      setLoading(false);
    }
  };

  // On mount: if a valid session already exists, skip the login form
  useEffect(() => {
    if (isAuthenticated()) {
      setLoggedIn(true);
      fetchQr();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoginSuccess = async () => {
    sessionOwnedRef.current = true; // we created this session
    setLoggedIn(true);
    await fetchQr();
  };

  const handleBack = () => {
    setLoggedIn(false);
    setTokenData(null);
    // Only clear tokens if we issued the login — don't log the user out of the dashboard
    if (sessionOwnedRef.current) {
      clearTokens();
      sessionOwnedRef.current = false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1C2434] to-[#111928] p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        {!loggedIn ? (
          <LoginStep onSuccess={handleLoginSuccess} />
        ) : loading && !tokenData ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="w-10 h-10 text-gray-300 animate-spin" />
            <p className="text-gray-400 text-sm">Generating your QR code…</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
            <button onClick={fetchQr} className="btn-primary text-sm">
              Try Again
            </button>
            <button onClick={handleBack} className="block mx-auto mt-3 text-sm text-gray-500 hover:text-gray-700">
              Sign out
            </button>
          </div>
        ) : tokenData ? (
          <QrDisplay
            tokenData={tokenData}
            onRefresh={fetchQr}
            onBack={handleBack}
            refreshing={loading}
            sessionOwned={sessionOwnedRef.current}
          />
        ) : null}
      </div>
    </div>
  );
}
