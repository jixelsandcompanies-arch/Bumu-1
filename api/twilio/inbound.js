import crypto from 'node:crypto';
import { acceptNextOfKinByPhone } from '../_lib/database.js';

function sendXml(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/xml');
  res.end(`<Response><Message>${String(message || '').replace(/[<>&'"]/g, '')}</Message></Response>`);
}

function readForm(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      resolve(Object.fromEntries(new URLSearchParams(body)));
    });
  });
}

function validTwilioSignature(req, params) {
  const token = process.env.TWILIO_AUTH_TOKEN || '';
  if (!token) return true;

  const signature = String(req.headers['x-twilio-signature'] || '');
  if (!signature) return false;

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const url = `${protocol}://${host}${req.url}`;
  const payload = Object.keys(params)
    .sort()
    .reduce((value, key) => `${value}${key}${params[key]}`, url);
  const expected = crypto.createHmac('sha1', token).update(payload).digest('base64');
  if (signature.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendXml(res, 405, 'Method not allowed.');
    return;
  }

  try {
    const params = await readForm(req);
    if (!validTwilioSignature(req, params)) {
      sendXml(res, 403, 'Unauthorized.');
      return;
    }

    const body = String(params.Body || '').trim().toLowerCase();
    const from = String(params.From || '').trim();
    const accepts = ['1', 'yes', 'y', 'accept', 'accepted', 'ok'].includes(body);

    if (!accepts) {
      sendXml(res, 200, 'Reply 1 or YES to accept being next-of-kin for this Bumu Paygo application.');
      return;
    }

    await acceptNextOfKinByPhone(from);
    sendXml(res, 200, 'Thank you. Your next-of-kin acceptance has been confirmed.');
  } catch (error) {
    sendXml(res, error.statusCode || 500, error.message || 'Could not confirm acceptance.');
  }
}
