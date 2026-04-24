import apiClient from './axios';
import axios from 'axios';

// Bare axios instance for kiosk (no auth header — token is in the request body)
const kioskClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

export type AttendanceEventType = 'CLOCK_IN' | 'LUNCH_OUT' | 'LUNCH_IN' | 'CLOCK_OUT';
export type AttendanceMethod = 'MANUAL' | 'QR';
export type AttendanceRecordStatus = 'IN_PROGRESS' | 'COMPLETE' | 'EXCEPTION';

export interface AttendanceEvent {
  id: string;
  recordId: string;
  eventType: AttendanceEventType;
  method: AttendanceMethod;
  occurredAt: string;
  sourceIp?: string;
  sourceDevice?: string;
  qrTerminalId?: string;
  isCorrection: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  workDate: string;
  status: AttendanceRecordStatus;
  totalWorkMins: number | null;
  totalBreakMins: number | null;
  timezone: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
}

export interface TodayResponse {
  record: AttendanceRecord | null;
  timeline: AttendanceEvent[];
  currentState: AttendanceEventType | 'NOT_STARTED';
  nextActions: AttendanceEventType[];
  methodAvailability: { manualEnabled: boolean; qrEnabled: boolean; disabledReason?: string };
}

export interface ActionResponse {
  record: AttendanceRecord;
  event: AttendanceEvent;
  timeline: AttendanceEvent[];
  currentState: AttendanceEventType;
  nextActions: AttendanceEventType[];
}

export interface TimesheetRow {
  id: string;
  workDate: string;
  userId: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  clockInAt: string | null;
  clockOutAt: string | null;
  totalWorkMins: number | null;
  totalBreakMins: number | null;
  status: AttendanceRecordStatus;
  methods: AttendanceMethod[];
  timezone: string;
  correctionCount: number;
}

export interface EmployeeQrToken {
  qrToken: string;
  expiresAt: string;
  employee: { id: string; firstName: string; lastName: string };
}

export interface KioskScanResult {
  actionPerformed: AttendanceEventType;
  employee: { id: string; firstName: string; lastName: string };
  timestamp: string;
  record: AttendanceRecord;
}

export interface QrTerminal {
  id: string;
  name: string;
  code: string;
  location?: string;
  isActive: boolean;
  expiresAt?: string;
  allowedActions: AttendanceEventType[];
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSettings {
  id: string;
  enableManualAttendance: boolean;
  enableQrAttendance: boolean;
  defaultMethod: AttendanceMethod;
  enableLunchTracking: boolean;
  requireLunchTracking: boolean;
  actionCooldownSeconds: number;
  timezone: string;
}

export const attendanceApi = {
  // Employee
  getToday: () =>
    apiClient.get<TodayResponse>('/attendance/me/today').then((r) => r.data),

  getHistory: (params?: { page?: number; limit?: number; from?: string; to?: string }) =>
    apiClient
      .get<{ data: { record: AttendanceRecord; events: AttendanceEvent[] }[]; meta: any }>(
        '/attendance/me/history',
        { params },
      )
      .then((r) => r.data),

  performAction: (action: AttendanceEventType) =>
    apiClient.post<ActionResponse>('/attendance/me/action', { action }).then((r) => r.data),

  qrScan: (terminalCode: string, action: AttendanceEventType) =>
    apiClient
      .post<ActionResponse>('/attendance/me/qr-scan', { terminalCode, action })
      .then((r) => r.data),

  // Admin
  getSettings: () =>
    apiClient.get<AttendanceSettings>('/admin/attendance/settings').then((r) => r.data),

  updateSettings: (data: Partial<AttendanceSettings>) =>
    apiClient.patch<AttendanceSettings>('/admin/attendance/settings', data).then((r) => r.data),

  getTimesheet: (params?: { page?: number; limit?: number; from?: string; to?: string; userId?: string }) =>
    apiClient
      .get<{ data: TimesheetRow[]; meta: any }>('/admin/attendance/timesheet', { params })
      .then((r) => r.data),

  correctRecord: (recordId: string, data: { reason: string; action: AttendanceEventType; occurredAt: string }) =>
    apiClient.patch(`/admin/attendance/records/${recordId}/correct`, data).then((r) => r.data),

  listTerminals: () =>
    apiClient.get<QrTerminal[]>('/admin/attendance/qr-terminals').then((r) => r.data),

  createTerminal: (data: { name: string; code: string; location?: string; allowedActions?: AttendanceEventType[]; expiresAt?: string }) =>
    apiClient.post<QrTerminal>('/admin/attendance/qr-terminals', data).then((r) => r.data),

  activateTerminal: (id: string) =>
    apiClient.patch<QrTerminal>(`/admin/attendance/qr-terminals/${id}/activate`).then((r) => r.data),

  deactivateTerminal: (id: string) =>
    apiClient.patch<QrTerminal>(`/admin/attendance/qr-terminals/${id}/deactivate`).then((r) => r.data),

  // My QR — requires auth
  getMyQr: () =>
    apiClient.get<EmployeeQrToken>('/attendance/me/qr').then((r) => r.data),

  // Kiosk scan — no auth (QR token is the credential)
  kioskScan: (qrToken: string, kioskId?: string, locationId?: string) =>
    kioskClient
      .post<KioskScanResult>('/attendance/kiosk/scan', { qrToken, kioskId, locationId })
      .then((r) => r.data),
};
