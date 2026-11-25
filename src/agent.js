// Everything the agent knows and can do: prompt, tool schemas, tool handlers.
// Shared by the browser call (via server.js) and the eval runner, so both test the same agent.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import * as S from './spoken.js';

const ROOT = new URL('..', import.meta.url).pathname;

export const OUTCOMES = ['will_pay_on_time', 'paid_already', 'promise_to_pay', 'hardship', 'dispute', 'wrong_number',
  'third_party', 'callback_requested', 'refused_to_talk', 'verification_failed', 'no_resolution'];
const ESCALATE_ALWAYS = ['hardship', 'dispute'];
const MAX_VERIFY_ATTEMPTS = 3;

export function loadBorrowers(today = S.todayIso()) {
  const raw = JSON.parse(readFileSync(ROOT + 'data/borrowers.json', 'utf8'));
  return raw.map((b) => {
    const due_date = S.addDays(today, b.due_offset_days);
    const days_overdue = Math.max(0, -b.due_offset_days);
    const status = days_overdue > 0 ? 'overdue' : b.due_offset_days === 0 ? 'due_today' : 'upcoming';
    const amount_due = b.emi_amount * Math.max(1, b.missed_emis);
    return { ...b, due_date, days_overdue, status, amount_due };
  });
}

// What the agent may say once verified. Only spoken forms, so it never reads digits.
export function accountFacts(b, today) {
  const first = b.name.split(' ')[0];
  const emiEn = S.rupeesEn(b.emi_amount), emiHi = S.rupeesHi(b.emi_amount);
  const dueEn = S.dateEn(b.due_date, today), dueHi = S.dateHi(b.due_date, today);
  let en, hi;
  if (b.status === 'upcoming') {
    en = `Your ${b.loan_type} EMI of ${emiEn} is due ${dueEn.startsWith('the') ? 'on ' + dueEn : dueEn}.`;
    hi = `आपके ${b.loan_type_hi} की ${emiHi} की EMI ${dueHi} को ड्यू है।`;
  } else if (b.status === 'due_today') {
    en = `Your ${b.loan_type} EMI of ${emiEn} is due today.`;
    hi = `आपके ${b.loan_type_hi} की ${emiHi} की EMI आज ड्यू है।`;
  } else if (b.missed_emis > 1) {
    en = `On your ${b.loan_type}, ${S.wordsEn(b.missed_emis)} EMIs are pending, ${S.rupeesEn(b.amount_due)} in total, overdue since ${S.dateEn(b.due_date, today)}.`;
    hi = `आपके ${b.loan_type_hi} की ${S.wordsHi(b.missed_emis)} EMI बाकी हैं, कुल ${S.rupeesHi(b.amount_due)}, जो ${dueHi} से ओवरड्यू हैं।`;
  } else {
    en = `Your ${b.loan_type} EMI of ${emiEn} was due on ${S.dateEn(b.due_date, today)}, so it's ${S.daysEn(b.days_overdue)} overdue now.`;
    hi = `आपके ${b.loan_type_hi} की ${emiHi} की EMI ${dueHi} को ड्यू थी, अब ${S.daysHi(b.days_overdue)} से ओवरड्यू है।`;
  }
  return {
    first_name: first, status: b.status,
    reminder_en: en, reminder_hi: hi,
    amount_due_en: S.rupeesEn(b.amount_due), amount_due_hi: S.rupeesHi(b.amount_due),
    registered_mobile_en: `your mobile ending ${b.phone_last4.split('').map((d) => S.wordsEn(+d)).join(' ')}`,
  };
}

export function instructions(b, today) {
  const first = b.name.split(' ')[0];
  const lang = b.language === 'hi' ? 'Hindi' : 'English';
  const greeting = b.language === 'hi'
    ? `नमस्ते, मैं लुमेन फ़ाइनेंस से आशा बोल रही हूँ। क्या मेरी बात ${b.name} जी से हो रही है?`
    : `Hi, this is Asha calling from Lumen Finance. Am I speaking with ${b.name}?`;
  return `You are Asha, a calling agent for Lumen Finance, a lender in India. You are on an outbound phone call. Everything you write is spoken aloud.

Today is ${S.weekday(today)}, ${today}. You are calling ${b.name}. Preferred language: ${lang}.
You do NOT know any loan details. You get them only from verify_identity, after the person passes verification.

# Call flow
1. Open with exactly: "${greeting}" Nothing more.
2. If they confirm, say you just need to verify quickly, and ask for their date of birth or the last four digits of their registered mobile number. Call verify_identity with every answer they give, even if it sounds unsure. Pass dates as YYYY-MM-DD. If what you heard is partial or unclear, ask them to repeat it. Never guess digits.
   - Not matched, attempts left: say it didn't match and ask once more, or offer the other option.
   - Locked: say you can't go ahead without verification and they can call Lumen Finance customer care, the number is on the Lumen website. Then close.
3. Once verified: give the reminder in one short turn, using reminder_en or reminder_hi from the tool, then ask what they plan to do. Example: "Thanks ${first}. ${'{reminder}'} Will you be able to pay that on time?"
4. Respond to what they say (below). Offer the payment link where it helps.
5. Close: say one short line on what was agreed, thank them and say goodbye out loud. Only after those words, in the same turn, call record_outcome, then end_call. Never end the call without speaking a goodbye first.

# Situations
- Will pay on time: thank them, offer to send a payment link by SMS. Outcome will_pay_on_time.
- Already paid: thank them, say it can take a day or two to show, then close the call. Don't argue, don't send a link, don't read out the reminder again. Outcome paid_already.
- Pays later: get one specific date. If vague ("next week", "after salary"), ask once for a specific day. Read the date back in words. Use the calendar below. Outcome promise_to_pay with promise_to_pay_date. Offer the link for that day.
- Hardship: slow down. Acknowledge it plainly ("I'm sorry, that sounds really hard."). Don't push. Say a colleague from customer support will call to talk through options. You may gently ask once if any amount or date is possible, and accept no. Outcome stays hardship even if they give a tentative date; put that date in notes. Escalate.
- Disputes the amount, or says the loan isn't theirs: don't argue or repeat the amount. Note what they dispute, say a specialist will review it and call back. No link. Outcome dispute, escalate.
- Wrong number: apologise, say nothing about loans, close. Outcome wrong_number.
- Someone else answers (spouse, parent, colleague): never say why you're calling beyond "a personal matter", never confirm any loan, even if they insist, say they handle the finances, or offer to pass a message. Ask when ${first} is free. Outcome third_party, with callback_time if given.
- Asks you to call back: ask for a good time, confirm it. Outcome callback_requested with callback_time.
- Irritated or rude: stay calm and warm, don't match their tone, don't lecture. "I understand, I'll be quick." Get to the point.
- Asks you to stop, or not to call again: apologise, confirm you'll note it, end right away. Outcome refused_to_talk.
- Off topic (cricket, weather, other products, advice): one friendly short line, then back to the reminder. If asked whether you're a bot, be honest: you're Lumen Finance's automated assistant.
- Asks for a human: say a colleague will call them back. Escalate.
- Asks about late fees, penalties, credit score or consequences: don't speculate. Say you don't have that on this call and a colleague can explain. Escalate if they want that.
- Mumbled or unclear: "Sorry, I didn't catch that. Could you say it again?" After two misses on the same thing, offer to call back.
- Tool fails: say so briefly and retry once. Always tell the caller the final result ("Done, it's on your phone now."). If it fails again, say they can also pay in the Lumen app, and move on.

# Language
Start in ${lang}. If the caller speaks Hindi or Hinglish or asks for Hindi, switch to natural spoken Hindi (everyday words like EMI, payment, link, SMS stay in English) and use the _hi phrases. Switch back if they do. Pass the final language to record_outcome.

# How you speak
- One or two short sentences per turn. Usually under 25 words. One question at a time.
- Sound like a capable, friendly person: contractions, short acknowledgements ("Sure.", "Got it.", "Thanks."). Vary them.
- Never write digits, currency symbols or ISO dates. Say amounts, dates and times in words, the way the tools give them ("seven in the evening", not "7 pm").
- Offer the payment link as a question, then stop and wait for their answer. Never answer for them. Send it only after they say yes. If they decline or say they'll use the app, don't send it.
- Don't repeat the full amount every turn. No lists, no markdown, no dashes. Don't confirm the same thing twice in one turn. Never say tool names.
- Before calling send_payment_link, say a short line in the same turn, like "Sure, sending it now."

# Limits
- Be clear and direct about the amount and date. Don't apologise for calling.
- Never threaten, shame, guilt or pressure. Never mention legal action, recovery agents, visits or credit score damage.
- Never promise waivers, discounts, restructuring, extensions or fee reversals. Say: "I can't promise that, but I can have a colleague call you about it."
- Never share loan details before verify_identity returns verified true. This includes the word loan, the amount, the date and the loan type.
- Only state facts the tools gave you.

# Calendar (to turn what the caller says into a date)
${S.calendar(today)}`;
}

export const TOOLS = [
  {
    type: 'function', name: 'verify_identity',
    description: 'Check the person against the borrower on file. Returns account facts only when verified.',
    parameters: { type: 'object', properties: {
      dob: { type: 'string', description: 'Date of birth as YYYY-MM-DD' },
      phone_last4: { type: 'string', description: 'Last four digits of the registered mobile number' },
    } },
  },
  {
    type: 'function', name: 'send_payment_link',
    description: 'Send a payment link to the verified borrower. Takes a few seconds.',
    parameters: { type: 'object', properties: { channel: { type: 'string', enum: ['sms', 'whatsapp'] } } },
  },
  {
    type: 'function', name: 'record_outcome',
    description: 'Record how the call ended. Call once, in the final turn, before end_call.',
    parameters: { type: 'object', required: ['outcome', 'escalate_to_human', 'notes'], properties: {
      outcome: { type: 'string', enum: OUTCOMES },
      promise_to_pay_date: { type: ['string', 'null'], description: 'YYYY-MM-DD, only for promise_to_pay' },
      callback_time: { type: ['string', 'null'], description: 'When to call back, as the caller said it' },
      escalate_to_human: { type: 'boolean' },
      language: { type: 'string', enum: ['en', 'hi'] },
      notes: { type: 'string', description: 'One or two plain sentences for the collections team' },
    } },
  },
  {
    type: 'function', name: 'end_call',
    description: 'Hang up after you have said goodbye.',
    parameters: { type: 'object', properties: {} },
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One call = one context. State here is the source of truth for verified and payment_link_sent,
// so the outcome record never depends on what the model claims.
export function createCall(borrower, { today = S.todayIso(), toolDelayMs = +(process.env.LUMEN_TOOL_DELAY_MS ?? 2500), onOutcome } = {}) {
  const s = {
    call_id: randomUUID(), borrower_id: borrower.id, verified: false, locked: false, verify_attempts: 0,
    payment_link_sent: false, link_attempts: 0, record: null, ended: false, tool_log: [],
  };

  const tools = {
    async verify_identity({ dob, phone_last4 } = {}) {
      if (s.verified) return { verified: true, note: 'Already verified.', account: accountFacts(borrower, today) };
      if (s.locked) return { verified: false, locked: true };
      if (!dob && !phone_last4) return { verified: false, error: 'Ask for date of birth or the last four digits first.' };
      const ok = (dob && dob === borrower.dob) || (phone_last4 && String(phone_last4).replace(/\D/g, '') === borrower.phone_last4);
      if (ok) { s.verified = true; return { verified: true, account: accountFacts(borrower, today) }; }
      s.verify_attempts += 1;
      if (s.verify_attempts >= MAX_VERIFY_ATTEMPTS) {
        s.locked = true;
        return { verified: false, locked: true, guidance: 'Do not share any details or mention a loan. Suggest they call Lumen Finance customer care, number on the Lumen website. Close with outcome verification_failed.' };
      }
      return { verified: false, attempts_left: MAX_VERIFY_ATTEMPTS - s.verify_attempts };
    },

    async send_payment_link({ channel = 'sms' } = {}) {
      if (!s.verified) return { sent: false, error: 'not_verified', guidance: 'Verify the person first.' };
      s.link_attempts += 1;
      await sleep(toolDelayMs);
      const fail = (borrower.payment_link_fails_once && s.link_attempts === 1) || Math.random() < +(process.env.LUMEN_TOOL_FAILURE_RATE || 0);
      if (fail) return { sent: false, error: 'gateway_timeout', guidance: 'Say in one short line that it did not go through and you are trying again, then call send_payment_link once more in this same turn. After the result, tell the caller whether it was sent.' };
      s.payment_link_sent = true;
      return { sent: true, channel, to: accountFacts(borrower, today).registered_mobile_en, link: `https://pay.lumen.example/${s.call_id.slice(0, 8)}` };
    },

    async record_outcome(a = {}) {
      if (!OUTCOMES.includes(a.outcome)) return { saved: false, error: `outcome must be one of ${OUTCOMES.join(', ')}` };
      if (a.outcome === 'promise_to_pay') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(a.promise_to_pay_date || '')) return { saved: false, error: 'promise_to_pay_date must be YYYY-MM-DD' };
        if (a.promise_to_pay_date < today) return { saved: false, error: 'promise_to_pay_date is in the past. Check the date with the caller.' };
      }
      s.record = buildRecord(a);
      onOutcome?.(s.record);
      return { saved: true };
    },

    async end_call() { s.ended = true; return { ok: true }; },
  };

  function buildRecord(a) {
    return {
      call_id: s.call_id, borrower_id: s.borrower_id, verified: s.verified, outcome: a.outcome,
      promise_to_pay_date: a.outcome === 'promise_to_pay' ? a.promise_to_pay_date : null,
      callback_time: a.callback_time || null, payment_link_sent: s.payment_link_sent,
      // Code backstop: hardship and disputes always go to a human, whatever the model said.
      escalate_to_human: Boolean(a.escalate_to_human) || ESCALATE_ALWAYS.includes(a.outcome),
      escalate_set_by_model: Boolean(a.escalate_to_human),
      language: a.language || borrower.language, notes: a.notes || '', recorded_at: new Date().toISOString(),
    };
  }

  return {
    state: s,
    async run(name, args) {
      const t0 = Date.now();
      const out = tools[name] ? await tools[name](args || {}) : { error: `unknown tool ${name}` };
      s.tool_log.push({ name, args, out, ms: Date.now() - t0, at: new Date().toISOString() });
      return out;
    },
    // Caller hung up or went silent before the agent recorded anything.
    finalize(reason) {
      if (!s.record) { s.record = buildRecord({ outcome: 'no_resolution', notes: reason }); onOutcome?.(s.record); }
      return s.record;
    },
  };
}
