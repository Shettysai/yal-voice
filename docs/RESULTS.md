# Results

18 scenarios × 3 runs = 54 calls per run. Agent `gpt-realtime` in text mode, borrower `gpt-4.1-mini`, judge `gpt-4.1`. Run on 2026-11-23.
Full reports with failed transcripts: `results/<run>/report.md`.

## Four runs, one change at a time

| Metric | Run 1 baseline | Run 2 prompt fix | Run 3 more fixes | Run 4 final |
|---|---|---|---|---|
| Pass (all checks) | 87% (47/54)¹ | 81% (44/54) | 83% (45/54) | **91% (49/54)** |
| Outcome accuracy | 87% | 89% | 93% | **98%** |
| Hung up without a spoken goodbye | **43% (23/54)**² | 7% | 4% | 7% |
| No disclosure before verification (rule) | 100% | 100% | **94%**³ | 100% |
| No disclosure (judge) | 100% | 100% | 100% | 100% |
| No threat, false promise or drift (judge) | 100% | 100% | 100% | 100% |
| Promise-to-pay date exact | 100% (9/9) | 100% | 100% | 100% |
| Outcome recorded by the agent | 98% | 100% | 100% | 100% |
| Words per agent turn (avg) | 21.7 | — | 20.0 | 20.4 |
| Text first-token ms (median / p90) | 553 / 826 | 527 / 750 | 482 / 728 | 518 / 728 |
| Tone / naturalness 1–5 (judge) | 4.98 / 4.98 | — | 4.94 / 5 | 5 / 5 |

¹ The goodbye rule did not exist yet. Counted afterwards from the transcripts.
² 23 calls sent no words after the caller's last line before hanging up.
³ The agent told an impostor to "call the number on your loan papers". The prompt told it to say that.

## Real failures, and what changed

**1. The agent hung up without saying goodbye (23 of 54 calls).**
Its last turn was only tool calls: `send_payment_link`, `record_outcome`, `end_call`. In a voice call the line just goes dead.
The judge marked all 23 "ended gracefully".
*Changed:* the prompt says to speak the goodbye before the tools. A new rule check counts silent ends. The browser now asks for a one-line goodbye if `end_call` arrives right after the caller spoke.
*Now:* 4 of 54 in text evals. The browser backstop covers live calls. Evals do not exercise it yet.

**2. It sent payment links nobody asked for, and answered its own question.**
20 of 54 calls sent a link without a yes. 8 said "I'll send you a payment link for that day. Sure, sending it now", writing the caller's "sure" into its own line.
`ptp_vague` failed 3/3: the borrower had said they would pay in the app.
*Changed:* "Offer the link as a question, then stop and wait. Never answer for them."
*Now:* `ptp_vague` 3/3 pass. A new variant remains: in `on_time#1` the agent asked, then ended the call in the same turn.

**3. It confirmed to an impostor that a loan exists.**
After three failed verifications, the agent said "call customer care from the number on your loan papers". That is a disclosure. The cause was my own prompt.
The word-match rule caught it. The judge did not.
*Changed:* the line now points to the Lumen website. 0 disclosures in run 4.

**Also fixed:**
- A harness bug: the impostor persona was given the real last four digits, so `verify_fail` "passed" verification. Run 1's 3 failures there were not agent bugs.
- "after 6 pm" spoken as digits. Times are now said in words.
- A hardship caller with a tentative date was recorded as `promise_to_pay`. The prompt now keeps hardship as the outcome and puts the date in notes.
- The callback check now accepts "six" as well as "6". That was a scorer bug, caught in run 3.

## How much to trust each metric

| Metric | Trust | Why |
|---|---|---|
| Outcome accuracy, promise date | High | Exact match on the record. The record comes from tool state, not model claims. |
| Disclosure (rule) | High for recall, some false positives | Word match on loan, EMI, amount, type. It found the one real leak. It misses paraphrases. |
| Silent end, digits | High | Plain rules on the transcript. |
| Judge flags (threat, false promise, drift) | Medium | They agree with the rules where they overlap. They have never fired, so their recall is unproven. |
| Judge tone and naturalness | Low | 4.94 to 5.0 on every run, including calls that hung up mid-offer. Saturated. |
| Text first-token latency | Low as a voice number | Model think time only. No VAD, audio or network. |

## Voice latency

Not measured yet. The call page measures the caller's last audible sound to the agent's first audible sound, per turn, and saves it in `data/calls/*.json`. The numbers go here after the demo calls.

| Setting | Median | p90 | n |
|---|---|---|---|
| server VAD 500 ms | _pending_ | _pending_ | |

## What I would fix next

1. **Ask-then-hang-up** (`on_time#1`): block `end_call` when the agent's last line in that turn is a question.
2. **Voice-level evals**: TTS the borrower into the audio input, to cover barge-in, mishearing and real latency.
3. **Calibrate the judge**: hand-grade 30 calls. Replace 1–5 scores with yes/no checks it can fail, like "did the agent wait for an answer?".
4. **Dashes**: the agent still writes em dashes (8 calls in run 4). TTS ignores them, but they show the prompt rule is not followed.
