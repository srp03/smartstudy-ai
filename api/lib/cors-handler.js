/**
 * CORS and response headers for Vercel serverless functions
 */

export function applyCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.VERCEL_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version,Authorization');
}

export function handleCorsOptions(req, res) {
  if (req.method === 'OPTIONS') {
    applyCorsHeaders(res);
    res.status(200).end();
    return true;
  }
  return false;
}

export function sendJson(res, data, statusCode = 200) {
  applyCorsHeaders(res);
  res.status(statusCode).json(data);
}

export function sendError(res, error, statusCode = 500) {
  applyCorsHeaders(res);
  const message = error && error.message ? error.message : String(error);
  res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  });
}
