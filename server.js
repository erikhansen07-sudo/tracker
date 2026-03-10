#!/usr/bin/env node
/**
 * server.js — Project Tracker local server
 * Serves the tracker and lets the browser save changes directly to tasks.json
 *
 * Run: node server.js
 * Then open: http://localhost:2222
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = 2222;
const DIR       = __dirname;
const TASKS     = path.join(DIR, 'tasks.json');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.css':  'text/css',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  // CORS headers (allows local access)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // POST /save — browser sends updated tasks, we write to tasks.json
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        fs.writeFileSync(TASKS, JSON.stringify(parsed, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        console.log('✓ tasks.json updated from browser');
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // GET — serve static files
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') urlPath = '/project-tracker.html';

  const filePath = path.join(DIR, urlPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + urlPath);
      return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('⚡ Project Tracker running at http://localhost:' + PORT);
  console.log('   Press Ctrl+C to stop.');
  console.log('');

  // Auto-open browser on Mac
  const { exec } = require('child_process');
  exec('open http://localhost:' + PORT);
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Is the server already running?`);
    console.error(`Open http://localhost:${PORT} in your browser.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
