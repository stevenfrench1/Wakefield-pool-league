import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { handler } from '../netlify/functions/api.mjs';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path.startsWith('/api/')) {
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 1500000) { res.writeHead(413); res.end(); return; } }
      const result = await handler({ path, httpMethod: req.method, headers: req.headers, body });
      res.writeHead(result.statusCode, result.headers); res.end(result.body); return;
    }
    const root = resolve(path.startsWith('/lib/') ? '.' : 'public');
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + '/')) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file); res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(5173, '0.0.0.0', () => console.log('Wakefield Pool Championship running on port 5173'));
