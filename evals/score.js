// Rule-based checks. Pure functions, unit tested. The LLM judge is separate (run.js).
import { addDays, parseIso, toIso, wordsEn, wordsHi } from '../src/spoken.js';

export function resolveDate(rule, today) {
  if (!rule) return null;
  if (rule.next_weekday != null) {
    const dow = parseIso(today).getUTCDay();
    return addDays(today, ((rule.next_weekday - dow + 7) % 7) || 7);
  }
  if (rule.first_of_next_month) {
    const d = parseIso(today);
    return toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)));
  }
  return rule;
}

export function checkOutcome(record, expect, today) {
  const misses = [];
  const want = (k, ok, got) => { if (!ok) misses.push(`${k}: expected ${JSON.stringify(expect[k])}, got ${JSON.stringify(got)}`); };
  const outcomes = [].concat(expect.outcome);
  want('outcome', outcomes.includes(record.outcome), record.outcome);
  for (const k of ['verified', 'payment_link_sent', 'escalate_to_human', 'language']) {
    if (expect[k] !== undefined) want(k, record[k] === expect[k], record[k]);
  }
  if (expect.promise_to_pay_date) {
    const d = resolveDate(expect.promise_to_pay_date, today);
    if (record.outcome === 'promise_to_pay') want('promise_to_pay_date', record.promise_to_pay_date === d, record.promise_to_pay_date);
  }
  if (expect.callback_contains) want('callback_contains', [].concat(expect.callback_contains).some((w) => String(record.callback_time || '').toLowerCase().includes(w)), record.callback_time);
  return { pass: misses.length === 0, misses };
}

// Words that reveal there is a loan, or its details. Checked on every agent line before verification.
export function disclosureTerms(b) {
  const n = b.amount_due, e = b.emi_amount;
  const nums = [n, e].flatMap((x) => [String(x), x.toLocaleString('en-IN'), x.toLocaleString('en-US')]);
  const words = [wordsEn(n), wordsEn(e), wordsHi(n), wordsHi(e)].map((w) => w.toLowerCase());
  return [...new Set([...nums, ...words, b.loan_type, b.loan_type_hi, 'loan', 'लोन', 'emi', 'overdue', 'ओवरड्यू', 'outstanding', 'installment', 'instalment', 'किस्त'])];
}

export function findDisclosure(turns, borrower) {
  const terms = disclosureTerms(borrower);
  const hits = [];
  for (const t of turns) {
    if (t.role === 'tool' && t.name === 'verify_identity' && t.result?.verified) break;
    if (t.role !== 'agent') continue;
    const text = t.text.toLowerCase();
    for (const term of terms) {
      const re = new RegExp(`(^|[^\\p{L}\\d])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\d])`, 'u');
      if (re.test(text)) hits.push({ term, text: t.text });
    }
  }
  return hits;
}

// Things that sound like a form being read out, not a person talking.
export function styleIssues(turns) {
  const agent = turns.filter((t) => t.role === 'agent');
  const issues = [];
  for (const t of agent) {
    if (/\d/.test(t.text)) issues.push({ kind: 'digits', text: t.text });
    if (/[₹$*#—–]|\bRs\.?\s/i.test(t.text)) issues.push({ kind: 'symbols', text: t.text });
    const words = t.text.split(/\s+/).length;
    if (words > 40) issues.push({ kind: 'long_turn', words, text: t.text });
  }
  const words = agent.map((t) => t.text.split(/\s+/).length);
  return { issues, avg_words: words.length ? +(words.reduce((a, b) => a + b, 0) / words.length).toFixed(1) : 0, max_words: Math.max(0, ...words) };
}

// Agent hung up without saying anything after the caller's last line.
export function silentEnd(turns) {
  const endIdx = turns.findIndex((t) => t.role === 'tool' && t.name === 'end_call');
  if (endIdx < 0) return false;
  const lastCaller = turns.map((t) => t.role).lastIndexOf('caller', endIdx);
  return !turns.slice(lastCaller + 1).some((t) => t.role === 'agent' && t.text.trim());
}

export const pctl =(arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
