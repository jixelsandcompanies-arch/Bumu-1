import { readJson, sendJson, sendOptions } from '../_lib/http.js';
import { assertBodySize, assertRateLimit } from '../_lib/security.js';
import { getSupabase, hasSupabaseConfig } from '../_lib/supabase.js';

const VALID_DIRECTIONS = new Set(['entry', 'exit']);
const VALID_CARD_TYPES = new Set(['student', 'organization']);

function normalizeText(value, maxLength = 160) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeDirection(value) {
  const direction = normalizeText(value).toLowerCase();
  return VALID_DIRECTIONS.has(direction) ? direction : 'entry';
}

function normalizeCardType(value, token = '') {
  const text = `${normalizeText(value, 32)} ${normalizeText(token, 180)}`.toLowerCase();
  if (text.includes('organization') || text.includes('company') || text.includes('master')) return 'organization';
  return VALID_CARD_TYPES.has(text.trim()) ? text.trim() : 'student';
}

function normalizeSchoolType(value) {
  const schoolType = normalizeText(value, 32).toLowerCase().replaceAll('_', ' ');
  if (schoolType.includes('boarding')) return 'boarding';
  if (schoolType.includes('day')) return 'day';
  return '';
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseClockMinutes(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

function currentNairobiMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

function organizationPunctuality({ direction, expectedScanTime, graceMinutes }) {
  const expectedMinutes = parseClockMinutes(expectedScanTime);
  if (expectedMinutes === null) {
    return { expectedScanTime: '', graceMinutes, status: 'unscheduled', lateMinutes: 0 };
  }

  const nowMinutes = currentNairobiMinutes();
  const diff = nowMinutes - expectedMinutes;

  if (direction === 'entry' && diff > graceMinutes) {
    return { expectedScanTime, graceMinutes, status: 'late', lateMinutes: diff };
  }

  if (direction === 'exit' && diff > graceMinutes) {
    return { expectedScanTime, graceMinutes, status: 'overtime', lateMinutes: diff };
  }

  if (direction === 'exit' && diff < -graceMinutes) {
    return { expectedScanTime, graceMinutes, status: 'early_leave', lateMinutes: Math.abs(diff) };
  }

  return { expectedScanTime, graceMinutes, status: 'on_time', lateMinutes: 0 };
}

function gradeUpdateOwner(schoolType) {
  if (schoolType === 'boarding') return 'class_teacher';
  if (schoolType === 'day') return 'parent';
  return '';
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    sendOptions(res, 'POST,OPTIONS');
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  try {
    assertBodySize(req);
    await assertRateLimit(req, { scope: 'school-scan', limit: 80, windowMs: 60_000 });

    const body = await readJson(req);
    const token = normalizeText(body.token, 180);
    const cardType = normalizeCardType(body.cardType, token);
    const schoolLocation = normalizeText(body.schoolLocation, 120) || 'School Location';
    const scanPoint = normalizeText(body.scanPoint, 80) || 'Main gate';
    const direction = normalizeDirection(body.direction);
    const studentClass = normalizeText(body.studentClass, 80);
    const stream = normalizeText(body.stream, 80);
    const schoolType = normalizeSchoolType(body.schoolType);
    const gradeUpdateBy = gradeUpdateOwner(schoolType);
    const graceMinutes = Math.max(0, Math.min(180, Math.trunc(normalizeNumber(body.graceMinutes) ?? 30)));
    const expectedScanTime = normalizeText(body.expectedScanTime, 16);
    const timing = cardType === 'organization'
      ? organizationPunctuality({ direction, expectedScanTime, graceMinutes })
      : { expectedScanTime: '', graceMinutes, status: '', lateMinutes: 0 };

    if (!token) {
      sendJson(res, 400, { message: 'Card QR token is required.' });
      return;
    }

    const event = {
      card_token: token,
      card_type: cardType,
      scanned_url: normalizeText(body.scannedUrl, 300),
      direction,
      student_class: studentClass,
      stream,
      school_type: schoolType,
      grade_update_by: gradeUpdateBy,
      school_location: schoolLocation,
      scan_point: scanPoint,
      scanner_name: normalizeText(body.scannerName, 120),
      scanner_phone: normalizeText(body.scannerPhone, 40),
      expected_scan_time: timing.expectedScanTime,
      grace_minutes: timing.graceMinutes,
      punctuality_status: timing.status,
      late_minutes: timing.lateMinutes,
      scanned_at: new Date().toISOString(),
      source: cardType === 'organization' ? 'organization_qr_scan' : 'school_qr_scan'
    };
    const latitude = normalizeNumber(body.latitude);
    const longitude = normalizeNumber(body.longitude);
    const gpsAccuracy = normalizeNumber(body.gpsAccuracy);
    const gpsCapturedAt = normalizeText(body.gpsCapturedAt, 64);

    if (latitude !== null && longitude !== null) {
      event.latitude = latitude;
      event.longitude = longitude;
      event.gps_accuracy_m = gpsAccuracy;
      event.gps_captured_at = gpsCapturedAt || null;
    }

    let stored = false;
    let storedEvent = null;
    let storageError = null;

    if (hasSupabaseConfig()) {
      let insertPayload = event;
      let { data, error } = await getSupabase()
        .from('student_gate_events')
        .insert(insertPayload)
        .select()
        .maybeSingle();

      if (error && /latitude|longitude|gps_|scanner_phone|card_type|expected_scan_time|grace_minutes|punctuality_status|late_minutes/i.test(error.message || '')) {
        const {
          latitude: _latitude,
          longitude: _longitude,
          gps_accuracy_m: _accuracy,
          gps_captured_at: _capturedAt,
          scanner_phone: _scannerPhone,
          card_type: _cardType,
          expected_scan_time: _expectedScanTime,
          grace_minutes: _graceMinutes,
          punctuality_status: _punctualityStatus,
          late_minutes: _lateMinutes,
          ...eventWithoutOptionalColumns
        } = event;
        insertPayload = eventWithoutOptionalColumns;
        const retry = await getSupabase()
          .from('student_gate_events')
          .insert(insertPayload)
          .select()
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        storageError = 'Scan could not be stored yet.';
      } else {
        stored = true;
        storedEvent = data;
      }
    }

    sendJson(res, 200, {
      ok: true,
      stored,
      event: storedEvent || event,
      storageError,
      parentNotification: {
        queued: false,
        message: cardType === 'organization'
          ? 'Organization scan saved for admin reporting.'
          : 'Parent notification will be enabled when student parent contact mapping is added.'
      },
      message: stored
        ? `${cardType === 'organization' ? (direction === 'entry' ? 'Sign in' : 'Sign out') : (direction === 'entry' ? 'Entry' : 'Exit')} scan saved for ${schoolLocation}${timing.status ? ` (${timing.status.replaceAll('_', ' ')})` : ''}.`
        : `${cardType === 'organization' ? (direction === 'entry' ? 'Sign in' : 'Sign out') : (direction === 'entry' ? 'Entry' : 'Exit')} scan accepted. Add the student_gate_events table to persist it in Supabase.`
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
