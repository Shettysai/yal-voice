// Browser side of a call: WebRTC to OpenAI Realtime, tool calls via our server,
// silence nudges, filler during slow tools, and latency measured from the audio itself.
const $ = (s) => document.querySelector(s);
const now = () => performance.now();
let C = null; // current call

// Read-only hook for the live trace panel: server events, client events, tool start/end.
export const trace = new EventTarget();
const emit = (type, detail) => trace.dispatchEvent(new CustomEvent(type, { detail }));

async function api(path, body) {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.status);
  return j;
}

// ---------- level meters: when did the caller stop, when did the agent start ----------
function meter(stream, ctx) {
  const a = ctx.createAnalyser(); a.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(a);
  const buf = new Float32Array(a.fftSize);
  return () => { a.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; return Math.sqrt(s / buf.length); };
}

function startMeters() {
  const ctx = new AudioContext();
  const mic = meter(C.mic, ctx), agent = meter(C.remote, ctx);
  C.audioCtx = ctx;
  C.meterTimer = setInterval(() => {
    const t = now();
    if (mic() > 0.02) C.lastCallerSound = t;
    const speaking = agent() > 0.01;
    const rising = speaking && !C.agentLoud; // agent was quiet on the last tick and is audible now
    C.agentLoud = speaking;
    if (speaking) C.lastAgentSound = t;
    if (C.clockWhenQuiet && !agentAudible()) {
      // Agent finished talking while a tool ran: the wait starts at its last sound.
      C.clockWhenQuiet = false;
      C.waitingSince ??= C.lastAgentSound;
    }
    if (rising && C.waitingSince != null) {
      // Caller's last sound before VAD fired -> first agent sound.
      const ms = Math.round(t - C.waitingSince);
      C.latencies.push(ms); renderLatency();
      C.waitingSince = null;
    }
  }, 10);
}

// Agent is audible while its audio buffer plays, or it made a sound in the last 300 ms (gaps between words).
const agentAudible = () => C.agentAudio || now() - C.lastAgentSound < 300;

// ---------- UI ----------
function line(who, text, id) {
  let el = id && document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.className = `msg ${who}`; if (id) el.id = id;
    $('#transcript').append(el);
  }
  el.textContent = text;
  $('#transcript').scrollTop = 1e9;
  return el;
}
const note = (text) => line('sys', text);
const status = (s) => { $('#status').textContent = s; $('#status').dataset.s = s; };

function pct(arr, p) { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }
function renderLatency() {
  const L = C.latencies;
  $('#lat').textContent = L.length ? `last ${L.at(-1)} ms · median ${pct(L, 0.5)} · p90 ${pct(L, 0.9)} · n=${L.length}` : '—';
}

// ---------- call ----------
export async function startCall(borrowerId) {
  status('connecting');
  emit('reset');
  $('#transcript').innerHTML = ''; $('#outcome').textContent = '';
  const s = await api('/api/session', { borrower_id: borrowerId });
  C = {
    id: s.call_id, silenceMs: s.silence_ms, nudges: s.nudges, nudgeCount: 0,
    transcript: [], latencies: [], bargeIns: [], toolTimings: [], fillers: 0,
    agentAudio: false, activeResponse: false, pendingCreate: false, ending: false, waitingSince: null, lastCallerSound: 0,
    agentLoud: false, lastAgentSound: -1e9, clockWhenQuiet: false, callerItems: new Map(),
  };

  const pc = new RTCPeerConnection();
  C.pc = pc;
  const audio = new Audio(); audio.autoplay = true;
  pc.ontrack = (e) => { audio.srcObject = e.streams[0]; C.remote = e.streams[0]; if (C.mic) startMeters(); };
  C.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  pc.addTrack(C.mic.getTracks()[0], C.mic);
  C.dc = pc.createDataChannel('oai-events');
  C.dc.onmessage = (m) => { const ev = JSON.parse(m.data); emit('server', ev); onEvent(ev); };
  C.dc.onopen = () => { status('agent speaking'); create(); }; // outbound call: agent speaks first

  await pc.setLocalDescription(await pc.createOffer());
  const r = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST', body: pc.localDescription.sdp,
    headers: { Authorization: `Bearer ${s.client_secret}`, 'Content-Type': 'application/sdp' },
  });
  if (!r.ok) throw new Error(`realtime: ${r.status} ${await r.text()}`);
  await pc.setRemoteDescription({ type: 'answer', sdp: await r.text() });
}

const send = (ev) => {
  if (C?.dc?.readyState !== 'open') return false;
  emit('client', ev);
  return C.dc.send(JSON.stringify(ev));
};

// Only one response may run at a time; queue the next one.
function create(response) {
  if (C.activeResponse) { C.pendingCreate = response || true; return; }
  C.activeResponse = true;
  send(response ? { type: 'response.create', response } : { type: 'response.create' });
}

function armSilence() {
  clearTimeout(C.silenceTimer);
  if (C.ending || C.toolsPending) return;
  C.silenceTimer = setTimeout(() => {
    const n = C.nudges[Math.min(C.nudgeCount, C.nudges.length - 1)];
    if (C.nudgeCount >= C.nudges.length) return hangup('caller silent');
    C.nudgeCount++;
    note(`(silence ${C.silenceMs / 1000}s, nudge ${C.nudgeCount})`);
    send({ type: 'conversation.item.create', item: { type: 'message', role: 'system', content: [{ type: 'input_text', text: n }] } });
    create();
  }, C.silenceMs);
}

const pendingCalls = [];

// Caller bubble and log entry in conversation order: placeholder at commit, text when transcribed.
function callerTurn(itemId, text) {
  let entry = C.callerItems.get(itemId);
  if (entry && text === undefined) return; // already shown
  if (!entry) {
    entry = { role: 'caller', text: '', at: Date.now() };
    C.callerItems.set(itemId, entry);
    C.transcript.push(entry);
  }
  if (text !== undefined) entry.text = text;
  line('caller', text === undefined ? '…' : text || '(inaudible)', 'u-' + itemId);
}

async function onEvent(ev) {
  switch (ev.type) {
    case 'input_audio_buffer.speech_started':
      clearTimeout(C.silenceTimer);
      C.nudgeCount = 0; C.clockWhenQuiet = false;
      if (C.agentAudio) { C.bargeIns.push({ at: Date.now() }); note('(caller interrupted)'); }
      status('listening');
      break;
    case 'input_audio_buffer.speech_stopped':
      // Start the clock from the caller's last audible sound, not from the VAD event.
      // Not while the agent is audible: its ongoing audio is not a reply.
      if (!agentAudible()) C.waitingSince = C.lastCallerSound || now();
      status('thinking');
      break;
    case 'input_audio_buffer.committed':
      // The caller's turn enters the conversation here, before the agent replies.
      callerTurn(ev.item_id);
      break;
    case 'conversation.item.input_audio_transcription.completed':
      callerTurn(ev.item_id, ev.transcript || '');
      break;
    case 'conversation.item.input_audio_transcription.failed':
      callerTurn(ev.item_id, '');
      break;
    case 'response.created':
      C.activeResponse = true;
      break;
    case 'response.output_audio_transcript.delta':
      C.agentText = (C.agentText || '') + ev.delta;
      line('agent', C.agentText, 'a-' + ev.response_id);
      break;
    case 'response.output_audio_transcript.done':
      C.transcript.push({ role: 'agent', text: ev.transcript, at: Date.now() });
      C.agentText = '';
      break;
    case 'output_audio_buffer.started':
      C.agentAudio = true; clearTimeout(C.silenceTimer); status('agent speaking');
      break;
    case 'output_audio_buffer.stopped':
    case 'output_audio_buffer.cleared':
      C.agentAudio = false;
      if (C.ending) return setTimeout(() => hangup('agent ended call'), 400);
      status('listening'); armSilence();
      break;
    case 'response.output_item.done':
      // Start the tool as soon as its arguments are ready, before the response finishes.
      if (ev.item.type === 'function_call') pendingCalls.push(runTool(ev.item));
      break;
    case 'response.done': {
      C.activeResponse = false;
      const isFiller = ev.response?.metadata?.kind === 'filler';
      if (!isFiller && pendingCalls.length) {
        C.toolsPending = true;
        const results = await Promise.all(pendingCalls.splice(0));
        C.toolsPending = false;
        for (const r of results) send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: r.call_id, output: JSON.stringify(r.out) } });
        if (results.some((r) => r.name === 'end_call')) {
          C.ending = true;
          // Backstop: never hang up on a caller without a spoken goodbye.
          if (C.transcript.at(-1)?.role === 'caller') { create({ conversation: 'none', output_modalities: ['audio'], instructions: 'Say a short, warm goodbye in the language of this call. One sentence.' }); return; }
          if (!C.agentAudio) setTimeout(() => hangup('agent ended call'), 400);
          return;
        }
        // Tool gap counts toward what the caller hears as waiting. If the agent is still talking, start at its last sound.
        if (agentAudible()) C.clockWhenQuiet = true; else C.waitingSince ??= now();
        create();
      } else if (C.pendingCreate) {
        const p = C.pendingCreate; C.pendingCreate = false; create(p === true ? undefined : p);
      }
      break;
    }
    case 'error':
      if (ev.error?.code === 'conversation_already_has_active_response') { C.pendingCreate = C.pendingCreate || true; break; }
      note(`(error: ${ev.error?.message})`);
      break;
  }
}

async function runTool(item) {
  const args = JSON.parse(item.arguments || '{}');
  const t0 = now();
  emit('tool', { phase: 'start', call_id: item.call_id, name: item.name, args });
  note(`→ ${item.name} ${JSON.stringify(args)}`);
  status('tool: ' + item.name);
  // If a tool is slow and nobody is talking, say something short instead of dead air.
  const filler = setTimeout(() => {
    if (C.agentAudio || C.activeResponse) return;
    C.fillers++;
    emit('tool', { phase: 'filler', call_id: item.call_id, name: item.name });
    const hindi = /[ऀ-ॿ]/.test(C.transcript.filter((t) => t.role === 'agent').at(-1)?.text || '');
    create({ conversation: 'none', output_modalities: ['audio'], metadata: { kind: 'filler' },
      instructions: `Say only this, warmly and briefly: "${hindi ? 'बस एक सेकंड, हो रहा है।' : 'Just a second, it’s going through.'}"` });
  }, 1500);
  let out;
  try { out = await api('/api/tool', { call_id: C.id, name: item.name, args }); }
  catch (e) { out = { error: 'tool_unavailable', guidance: 'Apologise briefly and continue without it.' }; }
  clearTimeout(filler);
  const ms = Math.round(now() - t0);
  C.toolTimings.push({ name: item.name, ms });
  emit('tool', { phase: 'end', call_id: item.call_id, name: item.name, ms, out });
  note(`← ${item.name} ${ms} ms ${JSON.stringify(out).slice(0, 160)}`);
  return { call_id: item.call_id, name: item.name, out };
}

export async function hangup(reason = 'operator hung up') {
  if (!C || C.closed) return;
  C.closed = true;
  clearTimeout(C.silenceTimer); clearInterval(C.meterTimer);
  C.pc?.close(); C.mic?.getTracks().forEach((t) => t.stop()); C.audioCtx?.close();
  status('ended');
  const { record } = await api('/api/calllog', {
    call_id: C.id, end_reason: reason, transcript: C.transcript, latencies_ms: C.latencies,
    barge_ins: C.bargeIns.length, fillers: C.fillers, tool_timings: C.toolTimings,
  });
  $('#outcome').textContent = JSON.stringify(record, null, 2);
}
