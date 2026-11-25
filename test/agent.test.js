import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordsEn, wordsHi, rupeesEn, ordinalEn, dateEn, dateHi } from '../src/spoken.js';
import { loadBorrowers, createCall, accountFacts, instructions } from '../src/agent.js';
import { findDisclosure, checkOutcome, resolveDate, styleIssues } from '../evals/score.js';

const T = '2026-11-24'; // a Tuesday

test('amounts are spoken the Indian way', () => {
  assert.equal(rupeesEn(12500), 'twelve thousand five hundred rupees');
  assert.equal(wordsEn(125000), 'one lakh twenty-five thousand');
  assert.equal(wordsEn(2499), 'two thousand four hundred and ninety-nine');
  assert.equal(wordsEn(10050), 'ten thousand and fifty');
  assert.equal(wordsHi(12500), 'बारह हज़ार पाँच सौ');
  assert.equal(wordsHi(37800), 'सैंतीस हज़ार आठ सौ');
});

test('dates are spoken like a person', () => {
  assert.equal(ordinalEn(5), 'the fifth'.slice(4));
  assert.equal(ordinalEn(22), 'twenty-second');
  assert.equal(ordinalEn(30), 'thirtieth');
  assert.equal(dateEn('2026-11-25', T), 'tomorrow');
  assert.equal(dateEn('2026-11-28', T), 'this Saturday, the twenty-eighth');
  assert.equal(dateEn('2026-11-12', T), 'the twelfth');
  assert.equal(dateEn('2026-12-05', T), 'the fifth of December');
  assert.equal(dateHi('2026-12-05', T), 'पाँच दिसंबर');
});

test('prompt carries no loan details before verification', () => {
  for (const b of loadBorrowers(T)) {
    const p = instructions(b, T).toLowerCase();
    assert.ok(!p.includes(b.loan_type), `${b.id} loan type leaked into prompt`);
    assert.ok(!p.includes(wordsEn(b.amount_due)), `${b.id} amount leaked into prompt`);
    assert.ok(!p.includes(b.dob) && !p.includes(b.phone_last4), `${b.id} verification secret in prompt`);
  }
});

test('verification gates account facts and locks after three misses', async () => {
  const b = loadBorrowers(T)[0];
  const c = createCall(b, { today: T, toolDelayMs: 0 });
  assert.equal((await c.run('send_payment_link', {})).error, 'not_verified');
  assert.equal((await c.run('verify_identity', { dob: '1990-01-01' })).attempts_left, 2);
  await c.run('verify_identity', { phone_last4: '0000' });
  const r = await c.run('verify_identity', { dob: '1990-01-02' });
  assert.equal(r.locked, true); assert.equal(r.account, undefined);
  assert.equal((await c.run('verify_identity', { dob: b.dob })).verified, false, 'locked stays locked');
});

test('record is built from call state, with escalation backstop', async () => {
  const b = loadBorrowers(T).find((x) => x.payment_link_fails_once);
  const c = createCall(b, { today: T, toolDelayMs: 0 });
  assert.ok((await c.run('verify_identity', { phone_last4: b.phone_last4 })).account.reminder_en.includes('rupees'));
  assert.equal((await c.run('send_payment_link', {})).sent, false, 'first link attempt fails for this borrower');
  assert.equal((await c.run('send_payment_link', {})).sent, true);
  assert.equal((await c.run('record_outcome', { outcome: 'promise_to_pay', promise_to_pay_date: '2026-11-01', escalate_to_human: false, notes: '' })).saved, false, 'past date rejected');
  await c.run('record_outcome', { outcome: 'hardship', escalate_to_human: false, notes: 'lost job' });
  assert.deepEqual([c.state.record.verified, c.state.record.payment_link_sent, c.state.record.escalate_to_human, c.state.record.escalate_set_by_model], [true, true, true, false]);
});

test('overdue reminder phrasing', () => {
  const v = loadBorrowers(T).find((x) => x.id === 'B005');
  assert.match(accountFacts(v, T).reminder_en, /two EMIs are pending, thirty-seven thousand eight hundred rupees in total/);
});

test('disclosure rule flags loan words before verification only', () => {
  const b = loadBorrowers(T)[0];
  const turns = [{ role: 'agent', text: 'Hi, is this Rahul?' }, { role: 'agent', text: 'It is about your personal loan.' },
    { role: 'tool', name: 'verify_identity', result: { verified: true } }, { role: 'agent', text: 'Your EMI is twelve thousand five hundred rupees.' }];
  assert.deepEqual([...new Set(findDisclosure(turns, b).map((h) => h.term))].sort(), ['loan', 'personal loan']);
});

test('outcome check and relative dates', () => {
  assert.equal(resolveDate({ next_weekday: 5 }, T), '2026-11-27');
  assert.equal(resolveDate({ next_weekday: 2 }, T), '2026-12-01');
  assert.equal(resolveDate({ first_of_next_month: true }, T), '2026-12-01');
  const r = { outcome: 'promise_to_pay', verified: true, promise_to_pay_date: '2026-11-27', payment_link_sent: false };
  assert.equal(checkOutcome(r, { outcome: 'promise_to_pay', verified: true, promise_to_pay_date: { next_weekday: 5 } }, T).pass, true);
  assert.equal(checkOutcome(r, { outcome: 'promise_to_pay', payment_link_sent: true }, T).pass, false);
  assert.equal(styleIssues([{ role: 'agent', text: 'Pay ₹12,500 by 05/12.' }]).issues.length, 2);
});

test('silent end is caught', async () => {
  const { silentEnd } = await import('../evals/score.js');
  assert.equal(silentEnd([{ role: 'caller', text: 'ok' }, { role: 'tool', name: 'end_call' }]), true);
  assert.equal(silentEnd([{ role: 'caller', text: 'ok' }, { role: 'agent', text: 'Bye!' }, { role: 'tool', name: 'end_call' }]), false);
});
