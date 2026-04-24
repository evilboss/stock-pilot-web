# Attendance Kiosk & My QR — Setup Guide

## Routes

| URL | Purpose | Auth |
|---|---|---|
| `/attendance/kiosk` | Full-screen kiosk scanner | None (QR token is the credential) |
| `/attendance/my-qr` | Employee QR display | Own login credentials |
| `/dashboard/attendance` | Employee self-service (manual clock in/out) | JWT session |
| `/dashboard/attendance/admin` | Admin timesheet + QR terminal management | JWT session (admin/manager role) |

---

## Kiosk Mode (`/attendance/kiosk`)

### How scanning works

The kiosk uses **HID keyboard emulation** — the standard mode for physical QR/barcode scanners. The scanner acts as a USB keyboard: it types the QR content rapidly then presses Enter.

**No camera permission needed.** Any USB or Bluetooth HID scanner works out of the box.

### Kiosk ID

Set a unique identifier for each physical kiosk device by running in the browser console:

```js
localStorage.setItem('kioskId', 'kiosk-entrance-main');
```

This ID is logged in the audit trail for every scan.

### Smart action logic

| Employee's last event today | Kiosk scan result |
|---|---|
| None (first scan) | `CLOCK_IN` |
| `CLOCK_IN` | `CLOCK_OUT` |
| `LUNCH_OUT` | `LUNCH_IN` (back from lunch) |
| `LUNCH_IN` | `CLOCK_OUT` |
| `CLOCK_OUT` | `CLOCK_IN` (next shift) |

### Duplicate scan guard

- **Backend**: configurable `actionCooldownSeconds` (set in Admin → Attendance Settings)
- **Frontend**: 10-second in-memory guard per employee — a second scan from the same employee within 10s is silently ignored with an error screen

### Error states

| Error | Displayed message |
|---|---|
| Expired QR | "Invalid or expired QR code. Please refresh your QR and try again." |
| Inactive account | "Employee account is inactive. Contact your administrator." |
| Network offline | Offline indicator shown in top bar; scan still attempted |
| Duplicate scan | "Already scanned recently. Please wait before scanning again." |

---

## Employee My QR (`/attendance/my-qr`)

### Access

- Entry point: login page → **"Show My Attendance QR"** button
- Direct URL: `/attendance/my-qr`
- Requires the employee's own credentials (separate login, no shared session)

### Token design

The QR encodes an opaque JWT, **not the employee ID**:

```json
{ "sub": "<userId>", "purpose": "attendance-qr", "iat": ..., "exp": ... }
```

- Signed with `JWT_SECRET`
- TTL: **8 hours** (refreshed daily on first login)
- Verified server-side at `POST /attendance/kiosk/scan` without any database lookup

### Refresh

- Tap **Refresh QR** to generate a new token (extends the 8-hour window)
- A countdown shows minutes remaining; the token turns yellow when under 30 minutes

---

## Backend API

### `GET /attendance/me/qr`

Requires: Bearer token (employee's JWT session)

```json
{
  "qrToken": "<signed-jwt>",
  "expiresAt": "2026-04-25T09:00:00.000Z",
  "employee": { "id": "...", "firstName": "Jane", "lastName": "Doe" }
}
```

### `POST /attendance/kiosk/scan`

No auth header needed. The `qrToken` is the credential.

Request:
```json
{
  "qrToken": "<token-from-my-qr>",
  "kioskId": "kiosk-entrance-main",
  "locationId": "building-a"
}
```

Response (200):
```json
{
  "actionPerformed": "CLOCK_IN",
  "employee": { "id": "...", "firstName": "Jane", "lastName": "Doe" },
  "timestamp": "2026-04-25T01:00:00.000Z",
  "record": { "id": "...", "status": "IN_PROGRESS", ... }
}
```

Errors: `401 Unauthorized` (bad/expired token) · `403 Forbidden` (inactive user) · `409 Conflict` (cooldown)

---

## Smoke test checklist

```
[ ] Employee logs in to /attendance/my-qr with valid credentials
[ ] QR code is displayed; scan with any QR reader shows a JWT string
[ ] Navigate to /attendance/kiosk in another tab/device
[ ] Use browser DevTools → manual token input (hover bottom of screen) to paste the JWT
[ ] Success screen shows employee name + "Clocked In" + timestamp
[ ] Scan again immediately → duplicate guard triggers error screen
[ ] Wait cooldown (default 60s), scan again → "Clocked Out"
[ ] Navigate to /dashboard/attendance/admin → Timesheet tab shows both events
[ ] Refresh QR on My QR page → new token, previous token is no longer valid
[ ] Deactivate an employee account → kiosk scan shows "inactive" error
```

---

## Production deployment notes

- The kiosk page has **no auth redirect** — it is intentionally public
- Deploy the kiosk on a dedicated tablet/screen in kiosk/lockdown mode
- Set `NEXT_PUBLIC_API_URL` to the internal API hostname
- The QR token TTL (8h) and cooldown are configurable in Admin → Settings
- All scans are written to `audit_logs` with `action: KIOSK_CLOCK_IN` etc.
