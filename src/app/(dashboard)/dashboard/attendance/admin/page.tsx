'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  QrCode,
  Settings,
  ListChecks,
  Plus,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import {
  attendanceApi,
  AttendanceEventType,
  QrTerminal,
  AttendanceSettings,
  TimesheetRow,
} from '@/lib/api/attendance';
import { cn } from '@/lib/utils';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtMins(mins: number | null | undefined) {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return format(parseISO(iso), 'hh:mm a');
}

function fmtDate(iso: string) {
  return format(parseISO(iso), 'MMM d, yyyy');
}

const STATUS_BADGE: Record<string, string> = {
  IN_PROGRESS: 'badge-green',
  COMPLETE: 'bg-gray-100 text-gray-700 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  EXCEPTION: 'badge-red',
};

// ── Timesheet list ─────────────────────────────────────────────────────────

function TimesheetTab() {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-timesheet', page, from, to],
    queryFn: () =>
      attendanceApi.getTimesheet({
        page,
        limit: 15,
        from: from || undefined,
        to: to || undefined,
      }),
  });

  const rows: TimesheetRow[] = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="form-label">From</label>
          <input
            type="date"
            className="form-input w-40"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          />
        </div>
        <div>
          <label className="form-label">To</label>
          <input
            type="date"
            className="form-input w-40"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
          />
        </div>
        {(from || to) && (
          <button
            className="btn-secondary text-sm"
            onClick={() => { setFrom(''); setTo(''); setPage(1); }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Clock In</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Clock Out</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Work</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Break</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Method</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading…
                  </td>
                </tr>
              )}
              {!isLoading && !rows.length && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    No attendance records found.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {row.user?.firstName} {row.user?.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{row.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(row.workDate)}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{fmtTime(row.clockInAt)}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{fmtTime(row.clockOutAt)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 hidden md:table-cell">{fmtMins(row.totalWorkMins)}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{fmtMins(row.totalBreakMins)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {row.methods.map((m) => (
                      <span key={m} className="badge-blue mr-1">{m}</span>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={STATUS_BADGE[row.status] ?? 'badge-blue'}>
                      {row.status}
                    </span>
                    {row.correctionCount > 0 && (
                      <span className="ml-1 badge-yellow">{row.correctionCount} fix</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {meta.total} records · page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary text-sm py-1 px-3 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary text-sm py-1 px-3 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── QR Terminals ───────────────────────────────────────────────────────────

function QrTerminalsTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');

  const { data: terminals = [], isLoading } = useQuery<QrTerminal[]>({
    queryKey: ['qr-terminals'],
    queryFn: attendanceApi.listTerminals,
  });

  const { mutate: createTerminal, isPending: creating } = useMutation({
    mutationFn: () => attendanceApi.createTerminal({ name, code, location: location || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-terminals'] });
      toast.success('QR terminal created');
      setShowForm(false);
      setName(''); setCode(''); setLocation('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create terminal'),
  });

  const { mutate: toggleTerminal } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? attendanceApi.activateTerminal(id) : attendanceApi.deactivateTerminal(id),
    onSuccess: (_, { active }) => {
      queryClient.invalidateQueries({ queryKey: ['qr-terminals'] });
      toast.success(active ? 'Terminal activated' : 'Terminal deactivated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Manage QR terminals employees scan for attendance.</p>
        <button className="btn-primary text-sm flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Add Terminal
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border border-primary/20">
          <h3 className="font-semibold text-gray-900 mb-4">New QR Terminal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="form-label">Name *</label>
              <input className="form-input" placeholder="Main Gate" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Code (unique) *</label>
              <input className="form-input" placeholder="GATE-01" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="form-label">Location</label>
              <input className="form-input" placeholder="Ground floor" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary text-sm"
              onClick={() => createTerminal()}
              disabled={!name || !code || creating}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
            <button className="btn-secondary text-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-6 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}

      {!isLoading && !terminals.length && (
        <div className="card p-8 text-center text-gray-400">
          <QrCode className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No QR terminals yet.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {terminals.map((t) => (
          <div key={t.id} className="card p-4 flex items-start gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', t.isActive ? 'bg-green-100' : 'bg-gray-100')}>
              <QrCode className={cn('w-5 h-5', t.isActive ? 'text-green-600' : 'text-gray-400')} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                <span className={t.isActive ? 'badge-green' : 'bg-gray-100 text-gray-500 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium'}>
                  {t.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{t.code}</p>
              {t.location && <p className="text-xs text-gray-400">{t.location}</p>}
              {t.expiresAt && (
                <p className="text-xs text-yellow-600 mt-0.5">Expires {fmtDate(t.expiresAt)}</p>
              )}
            </div>
            <button
              onClick={() => toggleTerminal({ id: t.id, active: !t.isActive })}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title={t.isActive ? 'Deactivate' : 'Activate'}
            >
              {t.isActive ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Settings tab ───────────────────────────────────────────────────────────

function SettingsTab() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<AttendanceSettings>({
    queryKey: ['attendance-settings'],
    queryFn: attendanceApi.getSettings,
  });

  const { mutate: save, isPending } = useMutation({
    mutationFn: (data: Partial<AttendanceSettings>) => attendanceApi.updateSettings(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['attendance-settings'], updated);
      toast.success('Settings saved');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to save'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  if (!settings) return null;

  function toggle(field: keyof AttendanceSettings) {
    save({ [field]: !(settings as any)[field] });
  }

  function ToggleRow({ field, label, description }: { field: keyof AttendanceSettings; label: string; description?: string }) {
    const value = !!(settings as any)[field];
    return (
      <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
        <button
          onClick={() => toggle(field)}
          disabled={isPending}
          className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 disabled:opacity-60"
        >
          {value ? (
            <ToggleRight className="w-6 h-6 text-green-500" />
          ) : (
            <ToggleLeft className="w-6 h-6" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Attendance Methods</h3>
        <ToggleRow field="enableManualAttendance" label="Allow manual clock-in" description="Employees can submit actions from their dashboard" />
        <ToggleRow field="enableQrAttendance" label="Allow QR scan" description="Employees clock in by scanning a terminal QR code" />
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Lunch Tracking</h3>
        <ToggleRow field="enableLunchTracking" label="Enable lunch tracking" description="Show Lunch Out / Lunch In actions" />
        <ToggleRow field="requireLunchTracking" label="Require lunch tracking" description="Employees must record lunch before clocking out" />
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Cooldown &amp; Timezone</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Action cooldown (seconds)</label>
            <input
              type="number"
              min={0}
              className="form-input"
              defaultValue={settings.actionCooldownSeconds}
              onBlur={(e) => save({ actionCooldownSeconds: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="form-label">Timezone</label>
            <input
              type="text"
              className="form-input"
              defaultValue={settings.timezone}
              onBlur={(e) => save({ timezone: e.target.value })}
              placeholder="Asia/Manila"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin page ─────────────────────────────────────────────────────────────

type Tab = 'timesheet' | 'terminals' | 'settings';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'timesheet', label: 'Timesheet', icon: ListChecks },
  { id: 'terminals', label: 'QR Terminals', icon: QrCode },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminAttendancePage() {
  const [tab, setTab] = useState<Tab>('timesheet');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
        <p className="text-gray-500 text-sm mt-1">Timesheet log, QR terminals, and configuration</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'timesheet' && <TimesheetTab />}
      {tab === 'terminals' && <QrTerminalsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}
