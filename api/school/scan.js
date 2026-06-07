import { readJson, sendJson, sendOptions } from '../_lib/http.js';
import { assertBodySize, assertRateLimit } from '../_lib/security.js';
import { getSupabase, hasSupabaseConfig } from '../_lib/supabase.js';

const VALID_DIRECTIONS = new Set(['entry', 'exit']);

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeDirection(value) {
  const direction = normalizeText(value).toLowerCase();
  return VALID_DIRECTIONS.has(direction) ? direction : 'entry';
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
    const token = normalizeText(body.token);
    const schoolLocation = normalizeText(body.schoolLocation) || 'School Location';
    const scanPoint = normalizeText(body.scanPoint) || 'Main gate';
    const direction = normalizeDirection(body.direction);

    if (!token) {
      sendJson(res, 400, { message: 'Student card QR token is required.' });
      return;
    }

    const event = {
      card_token: token,
      scanned_url: normalizeText(body.scannedUrl),
      direction,
      school_location: schoolLocation,
      scan_point: scanPoint,
      scanner_name: normalizeText(body.scannerName),
      scanned_at: new Date().toISOString(),
      source: 'school_qr_scan'
    };

    let stored = false;
    let storedEvent = null;
    let storageError = null;

    if (hasSupabaseConfig()) {
      const { data, error } = await getSupabase()
        .from('student_gate_events')
        .insert(event)
        .select()
        .maybeSingle();

      if (error) {
        storageError = error.message;
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
