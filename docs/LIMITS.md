# Known limits

> [!IMPORTANT]
> The biggest gap: **evals are text level.** They test the prompt, tools and gates, not the audio. Barge-in, mishearing, accents and voice latency are untested by evals.

| Covered by | Text evals | Live call page | Not covered |
|---|---|---|---|
| Outcome, dates, escalation | ✅ | ✅ | |
| Disclosure before verification | ✅ | ✅ | |
| Silent hang-up | ✅ rule | ✅ browser backstop | Backstop not in evals |
| Filler during slow tools | | ✅ | Not in evals |
| Silence nudges | ✅ simulated | ✅ | |
| Barge-in | | ✅ logged | Not scored |
| Voice latency | | ✅ measured per turn | No published numbers yet |
| Mishearing, accents | | | ❌ |
| Real telephony | | | ❌ |

## All limits

| Area | Limit | What it means | Next step |
|---|---|---|---|
| **Evals are text level** | Agent runs in Realtime text mode | Latency, barge-in, mishearing, accent and voice quality are not covered. Text mode can also behave a little differently from audio mode. | Voice-level runs: TTS the borrower into the audio input. |
| **Simulated borrower** | `gpt-4.1-mini` with a persona | Cooperates more than real people. Sometimes skips the script beat that makes a scenario hard. | Hand-review a sample. Add stricter persona beats. |
| **Judge** | `gpt-4.1`, one rubric, no human calibration | Tone and naturalness scores bunch at 4 to 5. Trust its yes/no flags more than its 1 to 5 scores. | Hand-grade about 30 calls and publish agreement. |
| **Disclosure rule** | Word match on loan, EMI, amount, type | Strict: "I can't share loan details" to a family member counts. Misses paraphrases like "your dues". | Pair with the judge flag. Both are reported. |
| **Latency** | Measured on one laptop, one network | Numbers move with Wi-Fi and region. | Run from a server near the OpenAI region. |
| **Verification** | DOB or last four digits, exact match | A misheard digit counts as a miss. Real systems need OTP or stronger checks. | |
| **Telephony** | Browser only | No voicemail or no-answer detection, no real dialling. | SIP via Twilio or the Realtime SIP endpoint. |
| **Human hand-off** | A flag in the record | No live transfer. | Warm transfer with the call summary. |
| **Mock data** | Due dates are relative to today | The demo always has upcoming and overdue cases. Pin `LUMEN_TODAY` for repeatable evals. | |
| **Mock tool timing** | Payment link delay is 2.5 s live, 300 ms in evals | The filler path runs only in live calls. | |
| **Single process** | Call state in memory | A server restart drops in-flight calls. | |
