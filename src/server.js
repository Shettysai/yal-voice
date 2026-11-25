// Small local server: serves the call page, mints Realtime sessions, runs the mock tools,
// and saves outcomes and call logs. No framework.
import { createServer } from 'node:http';
import { readFileSync, appendFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { loadBorrowers, createCall, instructions, TOOLS } from './agent.js';
import { todayIso } from './spoken.js';
import { realtimeSession, SILENCE_NUDGES } from './realtime.js';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = +(process.env.PORT || 3000);
const calls = new Map(); // call_id -> { call, borrower, startedAt }
mkdirSync(join(ROOT, 'data/calls'), { recursive: true });

const saveOutcome = (r) => appendFileSync(join(ROOT, 'data/outcomes.jsonl'), JSON.stringify(r) + '\n');

async function mintSession(borrower) {
  const today = todayIso();
  const res = await fetch(`${process.env.OPENAI_API_BASE || 'https://api.openai.com/v1'}/realtime/client_secrets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expires_after: { anchor: 'created_at', seconds: 600 }, session: realtimeSession(instructions(borrower, today), TOOLS) }),
  });
  if (!res.ok) throw new Error(`client_secrets ${res.status}: ${await res.text()}`);
  return (await res.json()).value;
}

const routes = {
  'GET /api/borrowers': () => loadBorrowers(),

  'POST /api/session': async ({ borrower_id }) => {
    const borrower = loadBorrowers().find((b) => b.id === borrower_id);
    if (!borrower) throw Object.assign(new Error('unknown borrower'), { status: 404 });
    const call = createCall(borrower, { onOutcome: saveOutcome });
    calls.set(call.state.call_id, { call, borrower, startedAt: new Date().toISOString() });
    return { call_id: call.state.call_id, client_secret: await mintSession(borrower), silence_ms: +(process.env.SILENCE_MS || 7000), nudges: SILENCE_NUDGES };
  },

  'POST /api/tool': async ({ call_id, name, args }) => {
    const c = calls.get(call_id);
    if (!c) throw Object.assign(new Error('unknown call'), { status: 404 });
    return c.call.run(name, args);
  },

  // Browser posts the transcript and timings when the call ends.
  'POST /api/calllog': async ({ call_id, ...log }) => {
    const c = calls.get(call_id);
    if (!c) throw Object.assign(new Error('unknown call'), { status: 404 });
    const record = c.call.finalize('Call ended before an outcome was recorded.');
    const file = { call_id, borrower_id: c.borrower.id, started_at: c.startedAt, record, tools: c.call.state.tool_log, ...log };
    writeFileSync(join(ROOT, 'data/calls', `${call_id}.json`), JSON.stringify(file, null, 2));
    calls.delete(call_id);
    return { record };
  },

  'GET /api/calls': () => readdirSync(join(ROOT, 'data/calls')).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(ROOT, 'data/calls', f), 'utf8')))
    .map(({ transcript, tools, ...rest }) => ({ ...rest, turns: transcript?.length || 0 }))
    .sort((a, b) => b.started_at.localeCompare(a.started_at)),

  'GET /api/evals/latest': () => {
    const dir = join(ROOT, 'results');
    const runs = existsSync(dir) ? readdirSync(dir).filter((d) => existsSync(join(dir, d, 'summary.json'))).sort() : [];
    return runs.length ? JSON.parse(readFileSync(join(dir, runs.at(-1), 'summary.json'), 'utf8')) : null;
  },
};

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const handler = routes[`${req.method} ${url.pathname}`];
  if (handler) {
    try {
      let body = '';
      for await (const chunk of req) body += chunk;
      const out = await handler(body ? JSON.parse(body) : {});
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(out));
    } catch (e) {
      console.error(e);
      res.writeHead(e.status || 500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  const path = url.pathname === '/' ? '/index.html' : url.pathname === '/how-it-works' ? '/how-it-works.html' : url.pathname;
  const file = join(ROOT, 'public', path.replace(/\.\.+/g, ''));
  if (!existsSync(file)) return res.writeHead(404).end('not found');
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
}).listen(PORT, () => console.log(`Lumen voice agent on http://localhost:${PORT}`));
