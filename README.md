# Lumen EMI Reminder Agent

A voice agent that calls a borrower about an EMI, verifies them, reminds them, finds out what they will do, and records a structured outcome.

![Node 22+](https://img.shields.io/badge/node-22%2B-339933?logo=nodedotjs&logoColor=white)
![OpenAI Realtime](https://img.shields.io/badge/OpenAI-gpt--realtime-412991?logo=openai&logoColor=white)
![WebRTC](https://img.shields.io/badge/audio-WebRTC-1f6feb)
![Dependencies](https://img.shields.io/badge/dependencies-1%20(ws)-informational)
![Tests](https://img.shields.io/badge/tests-9%20passing-2ea44f)
![Eval pass](https://img.shields.io/badge/eval%20pass-91%25%20(49%2F54)-2ea44f)

![Call page after a real demo call: borrower picker, transcript, live trace, latency chips and outcome card](docs/img/call-page.png)

<sub>A real demo call (Priya Nair, B002, 23 Nov 2026), replayed into the call page from its saved log. Transcript, tool results, latency and outcome are from the log. Timings in the live trace panel come from the replay, not the call.</sub>

## Quick start

```bash
cp .env.example .env        # add OPENAI_API_KEY
npm install
npm start                   # http://localhost:3000 (set PORT to change)
```

Pick a borrower, press **Start call**, and play the borrower. Use headphones.
The "You are playing" panel shows the date of birth and last four digits to verify with.
Needs Node 22+ and Chrome or Safari.

| Command | What it does |
|---|---|
| `npm start` | Call page on `/`, visual explainer on `/how-it-works`, eval runs on `/evals` |
| `npm run eval` | 18 scenarios × 3 runs, writes `results/<run>/report.md` |
| `npm run eval -- --only hardship_hindi,family_member --repeats 5` | A subset |
| `npm test` | Unit tests: spoken numbers and dates, verification gate, outcome record, scoring rules |

## What it does

```mermaid
flowchart LR
  G[Greet<br/>name only] --> V{Verify<br/>DOB or last 4}
  V -->|match| R[Remind<br/>amount + date in words]
  V -->|3 misses| X[Close<br/>verification_failed]
  R --> L[Listen<br/>what will they do]
  L --> A[Act<br/>link, date or escalate]
  A --> C[Close<br/>goodbye, record, hang up]
  G -->|wrong person, relative,<br/>call later, stop| C
```

| Step | What happens |
|---|---|
| Greet | "Hi, this is Asha calling from Lumen Finance. Am I speaking with Rahul Sharma?" Nothing about a loan. |
| Verify | Date of birth or last four digits go to `verify_identity`. Three misses lock the call. |
| Remind | The tool returns ready-to-say phrases: "twelve thousand five hundred rupees, due this Friday, the twenty-seventh". |
| Respond | Pay on time, paid, later date, hardship, dispute, wrong person, callback, stop, off topic, language switch. |
| Close | Goodbye, then `record_outcome`, then `end_call`. If the caller hangs up first, the server records `no_resolution`. |

## Try these calls

Due dates are relative to today, so the status stays the same on every run.

| ID | Borrower | Language | EMI | Status | Verify with | Try this |
|---|---|---|---|---|---|---|
| B001 | Rahul Sharma | English | ₹12,500 | due in 4 days | DOB 14 Mar 1990 or 4821 | Agree to pay on time, take the link |
| B002 | Priya Nair | English | ₹38,750 | due in 2 days | DOB 2 Nov 1987 or 7310 | Say you already paid. Or play her husband. |
| B003 | Arjun Mehta | English | ₹3,200 | 12 days overdue | DOB 21 Jul 1995 or 0093 | Promise a later day, or "I'm driving, call later" |
| B004 | Sunita Devi | Hindi | ₹2,499 | 5 days overdue | DOB 5 Jan 1979 or 5567 | Speak Hindi: job loss in the family |
| B005 | Vikram Singh | English | ₹18,900 | 40 days overdue | DOB 30 Sep 1984 or 2246 | Be rude, or ask for a fee waiver |
| B006 | Fatima Shaikh | English | ₹7,650 | due in 6 days | DOB 17 May 1998 or 8804 | Ask for the link. It fails once on purpose. |
| B007 | Karthik Reddy | English | ₹1,25,000 | due in 3 days | DOB 8 Dec 1981 or 1170 | Dispute the amount, or say "stop calling me" |
| B008 | Meena Iyer | Hindi | ₹9,999 | due today | DOB 26 Apr 1992 or 3359 | "This is not my loan". Or say nothing. |

## How it works

```mermaid
flowchart LR
  B["Browser<br/>mic, speaker, call.js"] <-->|"WebRTC audio + events"| O["OpenAI Realtime<br/>gpt-realtime, voice marin"]
  B -->|"POST /api/session"| S["Node server<br/>src/server.js"]
  B -->|"POST /api/tool"| S
  S -->|"mints 10 min client secret"| O
  S --> D[("data/outcomes.jsonl<br/>data/calls/*.json")]
```

| Part | Owns |
|---|---|
| Browser (`public/call.js`) | Audio, tool round trips, 7 s silence nudge, 1.5 s tool filler, goodbye backstop, latency from audio levels, live trace |
| OpenAI Realtime | Speech in and out, server VAD (500 ms), barge-in, transcription (`gpt-4o-mini-transcribe`) |
| Node server (`src/server.js`, `src/agent.js`) | API key, prompt, tool handlers, call state, outcome record |

Audio never passes through the server. The real API key never reaches the browser.
Open `/how-it-works` in the app for the interactive version. More in [docs/DESIGN.md](docs/DESIGN.md).

<details>
<summary>Screenshots from <code>/how-it-works</code></summary>

![Call flow: six steps with verification as the gate](docs/img/how-flow.png)
![Architecture: browser, OpenAI Realtime, Node server, storage, eval runner](docs/img/how-architecture.png)
![Topology: live call and eval run](docs/img/how-topology.png)
![Evals page: run 4 with the failed on_time #1 call open](docs/img/evals-page.png)

<sub>Last image: the <code>/evals</code> page, run 4, with one failed call open. It shows why it failed, the outcome record against the expected one, the judge flags and the transcript.</sub>

</details>

## Evals at a glance

18 scripted borrower scenarios × 3 runs = 54 simulated calls per run. Four runs, one change at a time.

| | Run 1 baseline | Run 4 final |
|---|---|---|
| Pass (all checks) | 87% (47/54)¹ | **91% (49/54)** |
| Outcome accuracy | 87% (47/54) | **98% (53/54)** |
| Hung up without a spoken goodbye | 43% (23/54) | 7% (4/54) |
| No disclosure before verification (rule and judge) | 100% | 100% |
| Promise-to-pay date exact | 9/9 | 9/9 |

<sub>¹ Run 1 had no silent-hang-up rule yet. Rescored with it, run 1 passes 24/54 (44%).</sub>

The evals found three real agent bugs: silent hang-ups, unasked payment links, and a disclosure to an impostor that my own prompt caused. They also found two harness bugs and one scorer bug. Details in [docs/RESULTS.md](docs/RESULTS.md).

> [!IMPORTANT]
> Evals run the same model, prompt and tools in **text mode**. They do not test audio: barge-in, mishearing, accents and voice latency are not covered. Live voice latency is not yet measured to a standard I would publish. See [Voice latency](docs/RESULTS.md#voice-latency).

## Docs

| Doc | Read it for |
|---|---|
| [Design](docs/DESIGN.md) | Stack trade-offs, call states, prompt, tools, guardrails, live call sequence |
| [Results](docs/RESULTS.md) | Four eval runs, real failures, what changed, how much to trust each metric |
| [Limits](docs/LIMITS.md) | What this does not do, and the next step for each |
| `/how-it-works` (in the app) | Animated call flow, architecture, topology, sequence, latency, eval loop |
| `/evals` (in the app) | Every eval run: headline numbers, trend across runs, one tile per call with its transcript |

## Repo layout

```
src/agent.js        prompt, tool schemas, tool handlers, outcome record
src/spoken.js       amounts and dates in spoken English and Hindi
src/realtime.js     Realtime session config + text-mode client for evals
src/server.js       call page, session keys, tools, call logs
public/             call page (call.js, trace.js), how-it-works page, evals page
data/borrowers.json 8 mock borrowers (due dates are relative to today)
evals/              scenarios.json, run.js (runner + judge + report), score.js (rules)
results/            one folder per eval run: report.md, summary.json, runs.jsonl
test/               node:test unit tests
docs/               design, results, limits, screenshots
```
