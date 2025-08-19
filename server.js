const http = require('http');
const fs = require('fs');
const path = require('path');

/*
 * A minimal HTTP server for the wedding website.
 *
 * This server performs two main functions:
 *  1. Serves static files out of the `public` directory.  This allows
 *     visitors to load HTML, CSS, JS and image assets for the home page
 *     and RSVP form.
 *  2. Accepts JSON‐encoded RSVP submissions via POST requests to
 *     `/rsvp` and appends each response to a JSON file on disk.  The
 *     stored data lives in `data/rsvps.json` relative to this script.
 *
 * Because the built‐in `http` module is used, there are no external
 * dependencies.  The implementation is intentionally straightforward
 * so that it can run in a constrained environment without installing
 * additional packages.
 */

// Determine the port from the environment, defaulting to 3000.  When
// deploying the site to a hosting platform (e.g. Render, Heroku), the
// platform typically sets the PORT environment variable.  For local
// development you can simply run `node server.js` and visit
// http://localhost:3000/.
const PORT = process.env.PORT || 3000;

// Absolute paths for convenience.
const PUBLIC_DIR = path.join(__dirname, 'public');
const RSVP_STORAGE = path.join(__dirname, 'data', 'rsvps.json');

// Helper to determine the appropriate Content‐Type header based on a
// file extension.  This is a simplified mapping covering common
// web formats used by the site.  Unknown types default to
// 'application/octet-stream'.
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

// Handle incoming requests.  The server distinguishes between
// static asset requests (GET) and RSVP submissions (POST).  CORS
// headers are added to allow the RSVP endpoint to be called from
// different origins should the form ever be embedded or proxied.
const server = http.createServer((req, res) => {
  // Normalise the pathname: strip query parameters and decode
  // percent‑encoded characters.  This helps prevent directory
  // traversal attacks and simplifies routing.
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // Handle RSVP POST submissions.  Clients must send JSON with
  // appropriate fields as defined in the RSVP form.  On success the
  // server responds with a 200 status and a small JSON message.  On
  // failure a 400 or 500 status is returned.  The server stores
  // submissions as an array in rsvps.json.  If the file does not
  // exist it is created with an empty array.
  if (req.method === 'POST' && pathname === '/rsvp') {
    // Accumulate incoming data chunks.  Because the payload is small
    // this simple approach suffices; for larger uploads a streaming
    // parser would be more appropriate.
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Guard against extremely large payloads to mitigate DoS
      // attacks.  1MB is more than enough for an RSVP form.
      if (body.length > 1e6) {
        req.socket.destroy();
      }
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        // Basic validation: ensure at least a name field exists.
        if (!data || typeof data.name !== 'string' || data.name.trim() === '') {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: 'Invalid submission: name is required' }));
          return;
        }
        // Load existing RSVPs or start with an empty array.
        let rsvps = [];
        try {
          if (fs.existsSync(RSVP_STORAGE)) {
            const fileContent = fs.readFileSync(RSVP_STORAGE, 'utf8');
            rsvps = JSON.parse(fileContent) || [];
          }
        } catch (e) {
          // If the file is unreadable treat as no existing RSVPs.
          rsvps = [];
        }
        // Append timestamped record.  Spread operator ensures we
        // preserve all fields provided by the client without assuming
        // the schema ahead of time.  Additional server‑side fields
        // (e.g. createdAt) can be added here.
        const record = { ...data, createdAt: new Date().toISOString() };
        rsvps.push(record);
        // Persist to disk.  Write synchronously to ensure that the
        // response is not sent until the data has been flushed.  For
        // higher throughput a queued asynchronous write mechanism
        // could be employed.
        fs.mkdirSync(path.dirname(RSVP_STORAGE), { recursive: true });
        fs.writeFileSync(RSVP_STORAGE, JSON.stringify(rsvps, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ message: 'Thank you for your RSVP!' }));
      } catch (err) {
        console.error('Failed to process RSVP', err);
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
    return;
  }

  // Provide a simple API to retrieve all RSVP submissions.  This route
  // returns the contents of the rsvps.json file as JSON.  CORS
  // headers are set to allow access from any origin.  If the file
  // doesn't exist yet an empty array is returned.  This makes it
  // easy to inspect RSVPs without logging into the server.
  if (req.method === 'GET' && pathname === '/rsvps') {
    fs.readFile(RSVP_STORAGE, 'utf8', (err, fileData) => {
      let responseJson;
      if (err) {
        // If file not found, return empty array instead of error.
        if (err.code === 'ENOENT') {
          responseJson = '[]';
        } else {
          console.error('Failed to read RSVP storage:', err);
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ error: 'Unable to read RSVPs' }));
          return;
        }
      } else {
        responseJson = fileData || '[]';
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(responseJson);
    });
    return;
  }

  // Handle CORS preflight for the RSVP endpoint.  Browsers send an
  // OPTIONS request before certain POSTs when cross‑origin.  Without
  // responding to OPTIONS the browser would block the request.  Here
  // we simply advertise that POSTs are allowed.
  if (req.method === 'OPTIONS' && pathname === '/rsvp') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // For everything else fall back to serving static files from the
  // public directory.  If the root path is requested, deliver the
  // index page.  Sanitize the request path to avoid directory
  // traversal by resolving the requested path within PUBLIC_DIR and
  // ensuring it starts with PUBLIC_DIR.
  if (req.method === 'GET') {
    // Default file is index.html when root requested.
    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    let filePath = path.join(PUBLIC_DIR, requestedPath);
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }
    // Attempt to read the file.  If it does not exist return 404.
    fs.readFile(resolvedPath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      const contentType = getContentType(resolvedPath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
    return;
  }

  // Catch‑all for unsupported methods or routes.
  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`Wedding website server is running on port ${PORT}`);
});
