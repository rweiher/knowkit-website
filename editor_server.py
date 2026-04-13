#!/usr/bin/env python3
"""
KnowKit Editor Server.

Serves the static website files AND provides POST /api/save-content to persist
the editor's changes into content.json.

Run from the project directory:
    python3 editor_server.py [--port 9101]
"""
import argparse
import json
import os
import shutil
import sys
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

CONTENT_FILE = 'content.json'
BACKUP_DIR = '.content-backups'


class EditorHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Compact log
        sys.stderr.write(f"[{datetime.now().strftime('%H:%M:%S')}] {self.address_string()} — {fmt % args}\n")

    def _json_response(self, status, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        # Prevent stale content.json during editing
        if self.path.endswith('content.json'):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        if self.path != '/api/save-content':
            self._json_response(404, {'ok': False, 'error': 'Unknown endpoint'})
            return

        length = int(self.headers.get('Content-Length') or 0)
        if length <= 0 or length > 2_000_000:  # sanity limit
            self._json_response(400, {'ok': False, 'error': 'Empty or oversized payload'})
            return

        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode('utf-8'))
        except json.JSONDecodeError as e:
            self._json_response(400, {'ok': False, 'error': f'Invalid JSON: {e}'})
            return

        # Sanity: must have de and en top-level keys
        if not isinstance(data, dict) or 'de' not in data or 'en' not in data:
            self._json_response(400, {'ok': False, 'error': 'Payload must contain "de" and "en" keys'})
            return

        # Backup current file
        try:
            os.makedirs(BACKUP_DIR, exist_ok=True)
            if os.path.exists(CONTENT_FILE):
                ts = datetime.now().strftime('%Y%m%d-%H%M%S')
                backup_path = os.path.join(BACKUP_DIR, f'content-{ts}.json')
                shutil.copy2(CONTENT_FILE, backup_path)
                # Keep only last 20 backups
                files = sorted(
                    (f for f in os.listdir(BACKUP_DIR) if f.startswith('content-') and f.endswith('.json')),
                    reverse=True
                )
                for old in files[20:]:
                    try: os.remove(os.path.join(BACKUP_DIR, old))
                    except OSError: pass
        except OSError as e:
            self._json_response(500, {'ok': False, 'error': f'Backup failed: {e}'})
            return

        # Write atomically: tmp file -> rename
        tmp_path = CONTENT_FILE + '.tmp'
        try:
            with open(tmp_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write('\n')
            os.replace(tmp_path, CONTENT_FILE)
        except OSError as e:
            self._json_response(500, {'ok': False, 'error': f'Write failed: {e}'})
            return

        self._json_response(200, {'ok': True, 'saved_at': datetime.now().isoformat(timespec='seconds')})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=9101)
    parser.add_argument('--host', default='127.0.0.1')
    args = parser.parse_args()

    # Ensure we serve from the script's directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    server = ThreadingHTTPServer((args.host, args.port), EditorHandler)
    url = f'http://{args.host}:{args.port}'
    print(f'KnowKit editor server running — {url}')
    print(f'  Website:  {url}/')
    print(f'  Editor:   {url}/editor.html')
    print('  Stop:     Ctrl+C')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down.')
        server.shutdown()


if __name__ == '__main__':
    main()
