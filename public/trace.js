// Live trace panel: one row per LLM call (Realtime response), tool call and caller turn.
// Reads only the `trace` hook from call.js. Never sends anything.
import { trace } from '/call.js';

const box = document.querySelector('#trace');
const totalsEl = document.querySelector('#trace-totals');
const now = () => performance.now();

let t0 = now();
let rows = new Map(); // key -> row state
let queue = [];       // client response.create sends waiting for response.created
let hint = null;      // what the next client response.create follows: 'nudge' | 'after tool'
let creates = 0;
let agentAudio = false;
let lastFiller = null;
let stick = true;

const fmtMs = (ms) => ms == null ? '' : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
const fmtAt = (t) => { const s = (t - t0) / 1000; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };
const num = (n) => Number(n || 0).toLocaleString('en-IN');
const clip = (s, n) => (s = String(s ?? '')).length > n ? s.slice(0, n - 1) + '…' : s;
const json = (v) => { try { return JSON.stringify(v, null, 2); } catch { return String(v); } };
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

box.addEventListener('scroll', () => { stick = box.scrollTop + box.clientHeight >= box.scrollHeight - 24; });
const follow = () => { if (stick) box.scrollTop = box.scrollHeight; };

function addRow(key, type, at) {
  const d = el('details', `tr ${type}`);
  const s = el('summary');
  const body = el('div', 'tbody');
  d.append(s, body);
  const row = { key, type, at, d, s, body };
  rows.set(key, row);
  box.append(d);
  return row;
}

// summary = [time] [tag] main parts, then optional second line
function paint(row) {
  const { s } = row;
  s.replaceChildren();
  s.append(el('span', 'tat', fmtAt(row.at)));
  const main = el('span', 'tmain');
  const line2 = el('span', 'tline2');
  if (row.type === 'llm') paintLlm(row, main, line2);
  else if (row.type === 'tool') paintTool(row, main, line2);
  else if (row.type === 'turn') paintTurn(row, main, line2);
  else paintErr(row, main, line2);
  s.append(main);
  if (line2.childNodes.length) s.append(line2);
  row.d.classList.toggle('bad', !!row.bad);
  follow();
}

const tag = (t, cls = '') => el('span', `ttag ${cls}`, t);
const pill = (t, cls = '') => el('span', `tpill ${cls}`, t);
const stat = (t) => el('span', 'tstat', t);

function statusPill(st, reason) {
  if (st === 'in_progress') return pill('running', 'run');
  const label = st === 'cancelled' && reason === 'turn_detected' ? 'cancelled: barge-in' : reason ? `${st}: ${reason}` : st;
  return pill(label, st === 'completed' ? 'ok' : st === 'cancelled' || st === 'incomplete' ? 'warn' : 'bad');
}

// ---------- LLM calls ----------
function paintLlm(r, main, line2) {
  main.append(tag('LLM', 'llm'), pill(r.kind, 'kind'), statusPill(r.status, r.reason));
  if (r.audioMs != null) main.append(stat(`${r.audioSrc} ${fmtMs(r.audioMs)}`));
  main.append(stat(r.status === 'in_progress' ? fmtMs(now() - r.at) : `total ${fmtMs(r.dur)}`));
  const u = r.usage;
  if (u) {
    const cached = u.input_token_details?.cached_tokens;
    main.append(stat(`in ${num(u.input_tokens)}${cached ? ` (cached ${num(cached)})` : ''}`), stat(`out ${num(u.output_tokens)}`));
  }
  if (r.text) line2.append(el('span', 'tsay', `"${clip(r.text, 140)}"`));
  if (r.calls.length) line2.append(el('span', 'tcalls', `calls ${r.calls.join(', ')}`));
  if (r.fillerFor) line2.append(el('span', 'tnote', `filler for ${r.fillerFor}`));
}

function llmBody(r) {
  r.body.replaceChildren();
  const add = (label, v) => { r.body.append(el('p', 'tlabel', label), el('pre', 'tpre', json(v))); };
  if (r.usage) add('Usage', r.usage);
  if (r.output) add('Output items', r.output);
  if (r.statusDetails) add('Status details', r.statusDetails);
  if (!r.body.childNodes.length) r.body.append(el('p', 'tlabel', 'Waiting for response.done'));
}

function kindFor(resp) {
  if (resp?.metadata?.kind === 'filler') {
    const i = queue.findIndex((q) => q.kind === 'filler');
    const q = i >= 0 ? queue.splice(i, 1)[0] : null;
    return { kind: 'filler', fillerFor: q?.fillerFor };
  }
  const i = queue.findIndex((q) => q.kind !== 'filler' && now() - q.t < 5000);
  if (i >= 0) return queue.splice(i, 1)[0];
  return { kind: 'reply' }; // server VAD started it from caller speech
}

// ---------- tool calls ----------
function paintTool(r, main, line2) {
  main.append(tag('Tool', 'tool'), el('span', 'tname', r.name));
  if (r.ms == null) main.append(pill('running', 'run'), stat(fmtMs(now() - r.at)));
  else main.append(pill(r.bad ? 'failed' : 'ok', r.bad ? 'bad' : 'ok'), stat(fmtMs(r.ms)));
  if (r.fillerAt != null) main.append(stat(`filler at ${fmtMs(r.fillerAt)}`));
  line2.append(el('code', 'targs', clip(JSON.stringify(r.args), 160)));
  if (r.out !== undefined) line2.append(el('code', 'tres', '→ ' + clip(JSON.stringify(r.out), 160)));
}

function toolBody(r) {
  r.body.replaceChildren(el('p', 'tlabel', 'Arguments'), el('pre', 'tpre', json(r.args)));
  if (r.out !== undefined) r.body.append(el('p', 'tlabel', 'Result'), el('pre', 'tpre', json(r.out)));
}

const isBad = (out) => !!(out && typeof out === 'object' && (out.error || out.sent === false || out.verified === false));

// ---------- caller turns ----------
function paintTurn(r, main, line2) {
  main.append(tag('Caller', 'turn'));
  if (r.bargeIn) main.append(pill('barge-in', 'warn'));
  main.append(stat(r.stop == null ? 'speaking' : `spoke ${fmtMs(r.stop - r.at)}`));
  if (r.text != null) line2.append(el('span', 'tsay', r.text ? `"${clip(r.text, 160)}"` : '(inaudible)'));
}

function paintErr(r, main, line2) {
  main.append(tag('Error', 'err'), stat(r.code || ''));
  line2.append(el('span', 'tsay', clip(r.message, 200)));
}

// ---------- totals ----------
function totals() {
  const llm = [...rows.values()].filter((r) => r.type === 'llm');
  const tools = [...rows.values()].filter((r) => r.type === 'tool' && r.ms != null);
  let inT = 0, outT = 0, cached = 0;
  for (const r of llm) { inT += r.usage?.input_tokens || 0; outT += r.usage?.output_tokens || 0; cached += r.usage?.input_token_details?.cached_tokens || 0; }
  const avg = tools.length ? Math.round(tools.reduce((a, r) => a + r.ms, 0) / tools.length) : null;
  const chip = (label, v) => { const c = el('span', 'chip'); c.append(label + ' ', el('b', null, v)); return c; };
  totalsEl.replaceChildren(
    chip('LLM calls', llm.length), chip('in', num(inT)), chip('out', num(outT)),
    chip('cached', inT ? `${Math.round((cached / inT) * 100)}%` : '0%'),
    chip('tools', tools.length), chip('avg tool', avg == null ? 'n/a' : `${avg} ms`),
  );
}

// ---------- events ----------
function reset() {
  t0 = now(); rows = new Map(); queue = []; hint = null; creates = 0; agentAudio = false; lastFiller = null; stick = true;
  box.replaceChildren(); totals();
}

trace.addEventListener('reset', reset);

trace.addEventListener('client', ({ detail: ev }) => {
  if (ev.type === 'conversation.item.create') {
    if (ev.item?.role === 'system') hint = 'nudge';
    else if (ev.item?.type === 'function_call_output') hint = 'after tool';
  } else if (ev.type === 'response.create') {
    const r = ev.response || {};
    const kind = r.metadata?.kind === 'filler' ? 'filler' : r.conversation === 'none' ? 'goodbye' : hint || (creates === 0 ? 'opening' : 'reply');
    queue.push({ kind, t: now(), hint, fillerFor: kind === 'filler' ? lastFiller : undefined });
    if (kind !== 'filler' && kind !== 'goodbye') hint = null;
    creates++;
  }
});

trace.addEventListener('server', ({ detail: ev }) => {
  const t = now();
  switch (ev.type) {
    case 'response.created': {
      const k = kindFor(ev.response);
      const r = addRow('r-' + ev.response.id, 'llm', t);
      Object.assign(r, { kind: k.kind, fillerFor: k.fillerFor, status: 'in_progress', calls: [], text: '' });
      llmBody(r); paint(r); totals();
      break;
    }
    case 'response.output_audio.delta':
    case 'output_audio_buffer.started': {
      if (ev.type === 'output_audio_buffer.started') agentAudio = true;
      const r = rows.get('r-' + ev.response_id);
      if (r && r.audioMs == null) { r.audioMs = t - r.at; r.audioSrc = ev.type === 'output_audio_buffer.started' ? 'playback in' : 'first audio'; paint(r); }
      break;
    }
    case 'output_audio_buffer.stopped':
    case 'output_audio_buffer.cleared':
      agentAudio = false;
      break;
    case 'response.output_audio_transcript.delta':
    case 'response.output_text.delta': {
      const r = rows.get('r-' + ev.response_id);
      if (r && ev.delta) { r.text += ev.delta; paint(r); }
      break;
    }
    case 'response.output_audio_transcript.done':
    case 'response.output_text.done': {
      const r = rows.get('r-' + ev.response_id);
      const v = ev.transcript ?? ev.text;
      if (r && v != null) { r.text = v; paint(r); }
      break;
    }
    case 'response.output_item.done': {
      const r = rows.get('r-' + ev.response_id);
      if (r && ev.item?.type === 'function_call' && !r.calls.includes(ev.item.name)) { r.calls.push(ev.item.name); paint(r); }
      break;
    }
    case 'response.done': {
      const resp = ev.response || {};
      let r = rows.get('r-' + resp.id);
      if (!r) { r = addRow('r-' + resp.id, 'llm', t); Object.assign(r, { kind: 'reply', calls: [], text: '' }); }
      r.status = resp.status || 'completed';
      r.statusDetails = resp.status_details || null;
      r.reason = resp.status_details?.reason || resp.status_details?.error?.code || '';
      r.dur = t - r.at;
      r.usage = resp.usage || null;
      r.output = resp.output || [];
      for (const it of r.output) if (it.type === 'function_call' && !r.calls.includes(it.name)) r.calls.push(it.name);
      r.bad = r.status === 'failed';
      llmBody(r); paint(r); totals();
      break;
    }
    case 'input_audio_buffer.speech_started': {
      const r = addRow('u-' + ev.item_id, 'turn', t);
      r.bargeIn = agentAudio;
      if (r.bargeIn) r.d.classList.add('barge');
      r.body.append(el('p', 'tlabel', `Item ${ev.item_id || ''}`));
      paint(r);
      break;
    }
    case 'input_audio_buffer.speech_stopped': {
      const r = rows.get('u-' + ev.item_id);
      if (r) { r.stop = t; paint(r); }
      break;
    }
    case 'conversation.item.input_audio_transcription.completed':
    case 'conversation.item.input_audio_transcription.failed': {
      const r = rows.get('u-' + ev.item_id);
      if (r) { r.text = ev.transcript || ''; paint(r); }
      break;
    }
    case 'error': {
      if (ev.error?.code === 'conversation_already_has_active_response') {
        // That create was refused; call.js re-sends it later.
        const q = queue.pop();
        if (q?.hint) hint = q.hint;
        if (q) creates--;
        break;
      }
      const r = addRow('e-' + t, 'err', t);
      Object.assign(r, { code: ev.error?.code || ev.error?.type, message: ev.error?.message || '', bad: true });
      r.body.append(el('pre', 'tpre', json(ev.error)));
      paint(r);
      break;
    }
  }
});

trace.addEventListener('tool', ({ detail: x }) => {
  const t = now();
  if (x.phase === 'start') {
    const r = addRow('t-' + x.call_id, 'tool', t);
    Object.assign(r, { name: x.name, args: x.args });
    toolBody(r); paint(r);
  } else if (x.phase === 'filler') {
    lastFiller = x.name;
    const r = rows.get('t-' + x.call_id);
    if (r) { r.fillerAt = t - r.at; paint(r); }
  } else if (x.phase === 'end') {
    const r = rows.get('t-' + x.call_id);
    if (!r) return;
    r.ms = x.ms; r.out = x.out; r.bad = isBad(x.out);
    toolBody(r); paint(r); totals();
  }
});

// Live elapsed time on running rows.
setInterval(() => {
  for (const r of rows.values()) if ((r.type === 'llm' && r.status === 'in_progress') || (r.type === 'tool' && r.ms == null)) paint(r);
}, 250);

totals();
