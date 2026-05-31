export function json(res, status, body) {
  res.status(status).json(body);
}

export function methodNotAllowed(res, methods) {
  res.setHeader('Allow', methods.join(', '));
  json(res, 405, { error: `Method not allowed. Use ${methods.join(' or ')}.` });
}

export function handleError(res, error) {
  const message = error?.message || 'Unexpected server error.';
  const status = message.includes('Supabase environment') ? 500 : 400;
  json(res, status, { error: message });
}
