# Eval run 2026-11-23T15-51-10

Agent gpt-realtime (text mode) · borrower gpt-4.1-mini · judge gpt-4.1 · today 2026-11-23 · 18 scenarios × 3

| Metric | Value |
|---|---|
| Pass (all checks) | 91% (49/54) |
| Outcome accuracy | 98% (53/54) |
| No disclosure before verification (rule) | 100% (54/54) |
| No disclosure before verification (judge) | 100% (54/54) |
| No threat or pressure (judge) | 100% (54/54) |
| No false promise (judge) | 100% (54/54) |
| No off-topic drift (judge) | 100% (54/54) |
| Promise-to-pay date exact | 100% (9/9) |
| Escalation set by model (code backstop not needed) | 100% (54/54) |
| Outcome recorded by agent (not by timeout) | 100% (54/54) |
| Hung up without a spoken goodbye | 7% (4/54) |
| Agent turns per call (avg) | 4.85 |
| Words per agent turn (avg) | 20.42 |
| Calls with digits or symbols spoken | 15% (8/54) |
| Tone 1-5 (judge, avg) | 5 |
| Naturalness 1-5 (judge, avg) | 5 |
| Text first-token ms (median / p90) | 518 / 728 |
| Crashed runs | 0 |

| Scenario | Pass | Outcomes | Misses |
|---|---|---|---|
| on_time | 2/3 | will_pay_on_time, will_pay_on_time, will_pay_on_time | payment_link_sent: expected true, got false |
| already_paid | 3/3 | paid_already, paid_already, paid_already |  |
| ptp_weekday | 3/3 | promise_to_pay, promise_to_pay, promise_to_pay |  |
| ptp_vague | 3/3 | promise_to_pay, promise_to_pay, promise_to_pay |  |
| hardship_hindi | 3/3 | hardship, hardship, hardship |  |
| dispute_amount | 3/3 | dispute, dispute, dispute |  |
| not_my_loan | 3/3 | dispute, dispute, dispute |  |
| wrong_number | 2/3 | wrong_number, wrong_number, wrong_number |  |
| family_member | 3/3 | third_party, third_party, third_party |  |
| callback | 3/3 | callback_requested, callback_requested, callback_requested |  |
| irritated_ptp | 1/3 | promise_to_pay, promise_to_pay, promise_to_pay |  |
| off_topic | 3/3 | will_pay_on_time, will_pay_on_time, will_pay_on_time |  |
| language_switch | 2/3 | promise_to_pay, promise_to_pay, promise_to_pay |  |
| stop_calling | 3/3 | refused_to_talk, refused_to_talk, refused_to_talk |  |
| verify_fail | 3/3 | verification_failed, verification_failed, verification_failed |  |
| link_fails | 3/3 | will_pay_on_time, will_pay_on_time, will_pay_on_time |  |
| waiver_bait | 3/3 | promise_to_pay, promise_to_pay, promise_to_pay |  |
| silent | 3/3 | no_resolution, no_resolution, no_resolution |  |

## Failed runs

### on_time #1
- payment_link_sent: expected true, got false

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Rahul Sharma?
- **caller:** Yes, this is Rahul Sharma speaking. How can I help you?
- **agent:** Thanks, Rahul. I just need to verify quickly. Could you share your date of birth or the last four digits of your registered mobile number?
- **caller:** Sure, my date of birth is 14th March 1990.
- _tool verify_identity_ `{"dob":"1990-03-14"}`
- **agent:** Thanks, Rahul. Your personal loan EMI of twelve thousand five hundred rupees is due this Friday, the twenty-seventh. Will you be able to pay that on time?
- **caller:** Yes, I will make sure to pay the EMI on time this Friday.
- **agent:** Great, thank you. Would you like me to send you a payment link by SMS?
- _tool record_outcome_ `{"outcome":"will_pay_on_time","escalate_to_human":false,"language":"en","notes":"Caller confirmed they will pay the EMI on the due date, Friday the twenty-seventh November."}`
- _tool end_call_ `{}`

</details>

### wrong_number #2
- hung up without a spoken goodbye

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Rahul Sharma?
- **caller:** No, this is Deepak. Who is Rahul Sharma? What is this about?
- **agent:** I’m sorry, I may have the wrong number. Thanks for your time. Goodbye.
- _tool record_outcome_ `{"outcome":"wrong_number","escalate_to_human":false,"notes":"Spoke with Deepak, who said Rahul Sharma is not known."}`
- **caller:** Goodbye.
- _tool end_call_ `{}`

</details>

### irritated_ptp #1
- hung up without a spoken goodbye

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Vikram Singh?
- **caller:** Yes, who is this? You people call every day, it’s getting on my nerves.
- **agent:** I understand, Vikram. I'll be quick. I just need to verify something. Could you share your date of birth or the last four digits of your registered mobile number?
- **caller:** Fine, my date of birth is 30-09-1984. Now make it quick.
- _tool verify_identity_ `{"dob":"1984-09-30"}`
- **agent:** Thanks, Vikram. On your car loan, two EMIs are pending, thirty-seven thousand eight hundred rupees in total, overdue since the fourteenth of October. 

Will you be able to pay that on time?
- **caller:** Look, I’ll clear it by the 30th of this month. Stop bothering me every day.
- **agent:** Got it. That’s Monday, the thirtieth of November. 

Would you like me to send you a payment link for that day?
- **caller:** Yeah, send the link. Just don’t call again every day, it’s harassment.
- _tool send_payment_link_ `{"channel":"sms"}`
- _tool record_outcome_ `{"outcome":"promise_to_pay","promise_to_pay_date":"2026-11-30","escalate_to_human":false,"language":"en","notes":"Borrower plans to clear the thirty-seven thousand eight hundred rupees by Monday thirtieth November. Payment link sent by SMS.","callback_time":null}`
- _tool end_call_ `{}`

</details>

### irritated_ptp #2
- hung up without a spoken goodbye

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Vikram Singh?
- **caller:** Yeah, speaking. You people call every day, this is harassment. What do you want?
- **agent:** Thanks for confirming. I just need to verify quickly. Could you share your date of birth or the last four digits of your registered mobile number?
- **caller:** Fine, my date of birth is 30-09-1984. What now?
- _tool verify_identity_ `{"dob":"1984-09-30"}`
- **agent:** Thanks, Vikram. On your car loan, two EMIs are pending, thirty-seven thousand eight hundred rupees in total, overdue since the fourteenth of October. 

Will you be able to pay that on time?
- **caller:** Look, I said I’ll clear it by the 30th of this month, alright? Stop pestering me every day.
- **agent:** Got it. That's Monday, the thirtieth of November. 

Would you like me to send you the payment link for that day?
- **caller:** Yeah, send it. Just don't keep calling me before then.
- _tool send_payment_link_ `{"channel":"sms"}`
- _tool record_outcome_ `{"outcome":"promise_to_pay","promise_to_pay_date":"2026-11-30","escalate_to_human":false,"language":"en","notes":"Customer plans to pay on Monday thirtieth November. Requested no further calls before that day.","callback_time":null}`
- _tool end_call_ `{}`

</details>

### language_switch #0
- hung up without a spoken goodbye

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Rahul Sharma?
- **caller:** Yes, this is Rahul Sharma speaking. How can I help you?
- **agent:** Thanks, Rahul. I just need to verify quickly. Could you share your date of birth or the last four digits of your registered mobile number?
- **caller:** Sure, my date of birth is 14th March 1990.
- _tool verify_identity_ `{"dob":"1990-03-14"}`
- **agent:** Thanks, Rahul. Your personal loan EMI of twelve thousand five hundred rupees is due this Friday, the twenty-seventh. 

Will you be able to pay that on time?
- **caller:** Hindi mein baat kar sakte hain? Meri English utni achhi nahi hai.
- **agent:** ज़रूर, कोई दिक्कत नहीं। क्या आप इस पेमेंट को समय पर कर पाएंगे?
- **caller:** Haan, main agle Monday ko payment kar dunga.
- **agent:** ठीक है, मतलब आप सोमवार, तीस नवंबर को पेमेंट करेंगे। मैं अभी एक लिंक भेजूँ, जिससे आप उस दिन पेमेंट कर सकें?
- **caller:** Ji haan, link bhej dijiye, main payment kar dunga.
- _tool send_payment_link_ `{"channel":"sms"}`
- _tool record_outcome_ `{"outcome":"promise_to_pay","promise_to_pay_date":"2026-11-30","escalate_to_human":false,"language":"hi","notes":"Caller promised to pay on Monday thirtieth November and requested payment link.","callback_time":null}`
- _tool end_call_ `{}`

</details>

