// OpenAI Realtime session config, plus a text-mode client the evals use to drive the same agent.
import WebSocket from 'ws';

export const MODEL = process.env.REALTIME_MODEL || 'gpt-realtime';

export function turnDetection() {
  if (process.env.TURN_DETECTION === 'semantic') {
    return { type: 'semantic_vad', eagerness: process.env.VAD_EAGERNESS || 'high', create_response: true, interrupt_response: true };
  }
  return {
    type: 'server_vad', threshold: 0.55, prefix_padding_ms: 300,
    silence_duration_ms: +(process.env.VAD_SILENCE_MS || 500), create_response: true, interrupt_response: true,
  };
}

export function realtimeSession(instructions, tools) {
  return {
    type: 'realtime', model: MODEL, instructions, tools, tool_choice: 'auto',
    output_modalities: ['audio'],
    audio: {
      input: {
        noise_reduction: { type: 'near_field' },
        transcription: { model: 'gpt-4o-mini-transcribe', prompt: 'Phone call in Indian English or Hindi. Hindi in Devanagari. Names, dates and digits.' },
        turn_detection: turnDetection(),
      },
      output: { voice: process.env.VOICE || 'marin' },
    },
  };
}

// Text in, text out, same model, prompt and tools as the voice call. Used by evals.
export class TextAgent {
  constructor({ instructions, tools, runTool }) {
    Object.assign(this, { instructions, tools, runTool });
  }

  async connect() {
    const base = (process.env.OPENAI_API_BASE || 'https://api.openai.com/v1').replace(/^http/, 'ws');
    this.ws = new WebSocket(`${base}/realtime?model=${MODEL}`, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } });
    this.waiters = [];
    this.ws.on('message', (m) => {
      const ev = JSON.parse(m);
      if (ev.type === 'error') console.error('realtime error:', ev.error?.message);
      this.waiters = this.waiters.filter((w) => !w(ev));
    });
    await new Promise((ok, fail) => { this.ws.once('open', ok); this.ws.once('error', fail); });
    this.send({ type: 'session.update', session: {
      type: 'realtime', instructions: this.instructions, tools: this.tools, tool_choice: 'auto',
      output_modalities: ['text'], audio: { input: { turn_detection: null } },
    } });
    await this.until((ev) => ev.type === 'session.updated');
  }

  send(ev) { this.ws.send(JSON.stringify(ev)); }
  until(pred, ms = 60000) {
    return new Promise((ok, fail) => {
      const t = setTimeout(() => fail(new Error('realtime timeout')), ms);
      this.waiters.push((ev) => (pred(ev) ? (clearTimeout(t), ok(ev), true) : false));
    });
  }

  // One response; resolves with text, function calls and time to first token.
  async respond() {
    const t0 = Date.now();
    let firstMs = null, text = '';
    const done = this.until((ev) => {
      if (ev.type === 'response.output_text.delta') { firstMs ??= Date.now() - t0; text += ev.delta; }
      return ev.type === 'response.done';
    });
    this.send({ type: 'response.create' });
    const ev = await done;
    const calls = (ev.response.output || []).filter((o) => o.type === 'function_call');
    if (firstMs === null && calls.length) firstMs = Date.now() - t0;
    return { text: text.trim(), calls, firstMs, status: ev.response.status };
  }

  // The agent's whole turn: speak, run tools, speak again, until it waits for the caller.
  async turn() {
    const out = { seq: [], firstMs: null, ended: false }; // seq keeps speech and tool calls in order
    for (let i = 0; i < 6; i++) {
      const r = await this.respond();
      out.firstMs ??= r.firstMs;
      if (r.text) out.seq.push({ role: 'agent', text: r.text });
      if (!r.calls.length) break;
      for (const c of r.calls) {
        const args = JSON.parse(c.arguments || '{}');
        const result = await this.runTool(c.name, args);
        out.seq.push({ role: 'tool', name: c.name, args, result });
        if (c.name === 'end_call') out.ended = true;
        this.send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: c.call_id, output: JSON.stringify(result) } });
      }
      if (out.ended) break;
    }
    return out;
  }

  say(text) {
    this.send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
  }

  system(text) {
    this.send({ type: 'conversation.item.create', item: { type: 'message', role: 'system', content: [{ type: 'input_text', text }] } });
  }

  close() { this.ws?.close(); }
}

// Same nudges the browser sends when the caller goes quiet.
export const SILENCE_NUDGES = [
  'The caller has been silent for several seconds. Briefly check if they can hear you.',
  'The caller is still silent. Say you will try again later, say goodbye, call record_outcome with no_resolution (or callback_requested), then end_call.',
];
