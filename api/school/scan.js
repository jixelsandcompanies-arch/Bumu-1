import { readJson, sendJson, sendOptions } from '../_lib/http.js';
import { assertBodySize, assertRateLimit } from '../_lib/security.js';
import { getSupabase, hasSupabaseConfig } from '../_lib/supabase.js';

const VALID_DIRECTIONS = new Set(['entry', 'exit']);

function normalizeText(value, maxLength = 160) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeDirection(value) {
  const direction = normalizeText(value).toLowerCase();
  return VALID_DIRECTIONS.has(direction) ? direction : 'entry';
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
    const schoolLocation = normalizeText(body.schoolLocation, 120) || 'School Location';
    const scanPoint = normalizeText(body.scanPoint, 80) || 'Main gate';
    const direction = normalizeDirection(body.direction);
    const studentClass = normalizeText(body.studentClass, 80);
    const stream = normalizeText(body.stream, 80);
    const schoolType = normalizeSchoolType(body.schoolType);
    const gradeUpdateBy = gradeUpdateOwner(schoolType);

    if (!token) {
      sendJson(res, 400, { message: 'Student card QR token is required.' });
      return;
    }

    const event = {
      card_token: token,
      scanned_url: normalizeText(body.scannedUrl, 300),
      direction,
      student_class: studentClass,
      stream,
      school_type: schoolType,
      grade_update_by: gradeUpdateBy,
      school_location: schoolLocation,
      scan_point: scanPoint,
      scanner_name: normalizeText(body.scannerName, 120),
      scanned_at: new Date().toISOString(),
      source: 'school_qr_scan'
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

      if (error && /latitude|longitude|gps_/i.test(error.message || '')) {
        const { latitude: _latitude, longitude: _longitude, gps_accuracy_m: _accuracy, gps_captured_at: _capturedAt, ...eventWithoutGps } = event;
        insertPayload = eventWithoutGps;
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
        message: 'Parent notification will be enabled when student parent contact mapping is added.'
      },
      message: stored
        ? `${direction === 'entry' ? 'Entry' : 'Exit'} scan saved for ${schoolLocation}.`
        : `${direction === 'entry' ? 'Entry' : 'Exit'} scan accepted. Add the student_gate_events table to persist it in Supabase.`
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { message: error.message });
  }
}
