'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LogIn,
  LogOut,
  Coffee,
  PlayCircle,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { attendanceApi, AttendanceEventType, TodayResponse } from '@/lib/api/attendance';
import { cn } from '@/lib/utils';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtMins(mins: number | null | undefined): string {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(iso: string): string {
  return format(parseISO(iso), 'hh:mm a');
}

function fmtDate(iso: string): string {
  return format(parseISO(iso), 'EEE, MMM d yyyy');
}

const EVENT_META: Record<
  AttendanceEventType,
  { label: string; icon: React.ElementType; color: string; dotColor: string }
> = {
  CLOCK_IN: { label: 'Clocked In', icon: LogIn, color: 'text-green-600', dotColor: 'bg-green-500' },
  LUNCH_OUT: { label: 'Lunch Out', icon: Coffee, color: 'text-yellow-600', dotColor: 'bg-yellow-500' },
  LUNCH_IN: { label: 'Lunch In', icon: PlayCircle, color: 'text-blue-600', dotColor: 'bg-blue-500' },
  CLOCK_OUT: { label: 'Clocked Out', icon: LogOut, color: 'text-gray-600', dotColor: 'bg-gray-500' },
};

const ACTION_LABELS: Record<AttendanceEventType, string> = {
  CLOCK_IN: 'Clock In',
  LUNCH_OUT: 'Lunch Out',
  LUNCH_IN: 'Back from Lunch',
  CLOCK_OUT: 'Clock Out',
};

const ACTION_STYLE: Record<AttendanceEventType, string> = {
  CLOCK_IN: 'bg-green-500 hover:bg-green-600 text-white',
  LUNCH_OUT: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  LUNCH_IN: 'bg-blue-500 hover:bg-blue-600 text-white',
  CLOCK_OUT: 'bg-gray-700 hover:bg-gray-800 text-white',
};

const STATUS_BADGE: Record<string, string> = {
  NOT_STARTED: 'badge-blue',
  CLOCK_IN: 'badge-green',
  LUNCH_OUT: 'badge-yellow',
  LUNCH_IN: 'badge-blue',
  CLOCK_OUT: 'bg-gray-100 text-gray-700 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  IN_PROGRESS: 'badge-green',
  COMPLETE: 'bg-gray-100 text-gray-700 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  EXCEPTION: 'badge-red',
};

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  CLOCK_IN: 'Working',
  LUNCH_OUT: 'On Lunch',
  LUNCH_IN: 'Working',
  CLOCK_OUT: 'Done',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  EXCEPTION: 'Exception',
};

// ── History tab ────────────────────────────────────────────────────────────

function HistoryTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['attendance-history', page],
    queryFn: () => attendanceApi.getHistory({ page, limit: 10 }),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-3">
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading history…
        </div>
      )}
      {!isLoading && !rows.length && (
        <div className="text-center py-12 text-gray-400">No attendance history yet.</div>
      )}
      {rows.map((row: any) => {
        const r = row.record ?? row;
        const events: any[] = row.events ?? [];
        const clockIn = events.find((e: any) => e.eventType === 'CLOCK_IN');
        const clockOut = events.find((e: any) => e.eventType === 'CLOCK_OUT');
        return (
          <div key={r.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {fmtDate(r.workDate)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {clockIn ? fmtTime(clockIn.occurredAt) : '—'} →{' '}
                  {clockOut ? fmtTime(clockOut.occurredAt) : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-xs text-gray-400">Work</p>
                <p className="font-semibold text-gray-900">{fmtMins(r.totalWorkMins)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Break</p>
                <p className="font-semibold text-gray-900">{fmtMins(r.totalBreakMins)}</p>
              </div>
              <span className={STATUS_BADGE[r.status] ?? 'badge-blue'}>
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </div>
          </div>
        );
      })}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary text-sm py-1 px-3 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary text-sm py-1 px-3 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'today' | 'history'>('today');

  const { data, isLoading } = useQuery<TodayResponse>({
    queryKey: ['attendance-today'],
    queryFn: attendanceApi.getToday,
    refetchInterval: 60_000,
  });

  const { mutate: performAction, isPending } = useMutation({
    mutationFn: (action: AttendanceEventType) => attendanceApi.performAction(action),
    onSuccess: (res) => {
      queryClient.setQueryData(['attendance-today'], (old: TodayResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          record: res.record,
          timeline: res.timeline,
          currentState: res.currentState,
          nextActions: res.nextActions,
        };
      });
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      toast.success(`${ACTION_LABELS[res.currentState]} recorded`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Action failed'),
  });

  const today = data;
  const currentState = today?.currentState ?? 'NOT_STARTED';
  const nextActions = today?.nextActions ?? (isLoading ? [] : ['CLOCK_IN' as AttendanceEventType]);
  const timeline = today?.timeline ?? [];
  const record = today?.record;
  const manualEnabled = today?.methodAvailability?.manualEnabled ?? true;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d yyyy')}</p>
      </div>

      {/* Status card */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Current Status</p>
            <span className={cn(STATUS_BADGE[currentState] ?? 'badge-blue', 'text-sm')}>
              {STATUS_LABEL[currentState] ?? currentState}
            </span>
          </div>
          {record?.status === 'COMPLETE' ? (
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          ) : (
            <Clock className="w-6 h-6 text-gray-300" />
          )}
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Work Time</p>
            <p className="text-2xl font-bold text-gray-900">{fmtMins(record?.totalWorkMins)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Break Time</p>
            <p className="text-2xl font-bold text-gray-900">{fmtMins(record?.totalBreakMins)}</p>
          </div>
        </div>

        {/* Disabled reason */}
        {today?.methodAvailability?.disabledReason && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {today.methodAvailability.disabledReason}
          </div>
        )}

        {/* Action buttons */}
        {nextActions.length > 0 && manualEnabled && (
          <div className="flex flex-wrap gap-3">
            {nextActions.map((action) => {
              const meta = EVENT_META[action];
              const Icon = meta.icon;
              return (
                <button
                  key={action}
                  onClick={() => performAction(action)}
                  disabled={isPending}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                    ACTION_STYLE[action],
                  )}
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  {ACTION_LABELS[action]}
                </button>
              );
            })}
          </div>
        )}

        {record?.status === 'COMPLETE' && (
          <p className="text-sm text-gray-500 text-center py-2">
            Shift complete. See you tomorrow!
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('today')}
          className={cn(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
            tab === 'today' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Today&apos;s Timeline
        </button>
        <button
          onClick={() => setTab('history')}
          className={cn(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
            tab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          History
        </button>
      </div>

      {/* Today timeline */}
      {tab === 'today' && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Timeline</h2>
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          {!isLoading && !timeline.length && (
            <p className="text-sm text-gray-400">No events today. Clock in to start your shift.</p>
          )}
          {timeline.length > 0 && (
            <ol className="relative border-l border-gray-200 ml-3 space-y-4">
              {timeline.map((ev) => {
                const meta = EVENT_META[ev.eventType];
                const Icon = meta.icon;
                return (
                  <li key={ev.id} className="ml-5">
                    <span
                      className={cn(
                        'absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full ring-2 ring-white',
                        meta.dotColor,
                      )}
                    />
                    <div className="flex items-center gap-3">
                      <Icon className={cn('w-4 h-4', meta.color)} />
                      <span className="font-medium text-sm text-gray-900">{meta.label}</span>
                      {ev.isCorrection && (
                        <span className="badge-yellow text-xs">Corrected</span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">{fmtTime(ev.occurredAt)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 pl-7">via {ev.method}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && <HistoryTab />}
    </div>
  );
}
