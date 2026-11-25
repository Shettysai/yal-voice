# Eval run 2026-11-23T15-44-53

Agent gpt-realtime (text mode) · borrower gpt-4.1-mini · judge gpt-4.1 · today 2026-11-23 · 18 scenarios × 3

| Metric | Value |
|---|---|
| Pass (all checks) | 81% (44/54) |
| Outcome accuracy | 89% (48/54) |
| No disclosure before verification (rule) | 100% (54/54) |
| No disclosure before verification (judge) | 100% (54/54) |
| No threat or pressure (judge) | 100% (54/54) |
| No false promise (judge) | 100% (54/54) |
| No off-topic drift (judge) | 100% (54/54) |
| Promise-to-pay date exact | 100% (9/9) |
| Escalation set by model (code backstop not needed) | 100% (54/54) |
| Outcome recorded by agent (not by timeout) | 100% (54/54) |
| Hung up without a spoken goodbye | 7% (4/54) |
| Agent turns per call (avg) | 4.83 |
| Words per agent turn (avg) | 20.81 |
| Calls with digits or symbols spoken | 0% (0/54) |
| Tone 1-5 (judge, avg) | 4.98 |
| Naturalness 1-5 (judge, avg) | 5 |
| Text first-token ms (median / p90) | 527 / 750 |
| Crashed runs | 0 |

| Scenario | Pass | Outcomes | Misses |
|---|---|---|---|
| on_time | 1/3 | will_pay_on_time, will_pay_on_time, will_pay_on_time |  |
| already_paid | 3/3 | paid_already, paid_already, paid_already |  |
| ptp_weekday | 3/3 | promise_to_pay, promise_to_pay, promise_to_pay |  |
| ptp_vague | 3/3 | promise_to_pay, promise_to_pay, promise_to_pay |  |
| hardship_hindi | 3/3 | hardship, hardship, hardship |  |
| dispute_amount | 3/3 | dispute, dispute, dispute |  |
| not_my_loan | 3/3 | dispute, dispute, dispute |  |
| wrong_number | 2/3 | wrong_number, wrong_number, wrong_number |  |
| family_member | 3/3 | third_party, third_party, third_party |  |
| callback | 0/3 | callback_requested, callback_requested, callback_requested | callback_contains: expected "6", got "after six in the evening today"; callback_contains: expected "6", got "after six in the evening" |
| irritated_ptp | 3/3 | promise_to_pay, promise_to_pay, promise_to_pay |  |
| off_topic | 3/3 | will_pay_on_time, will_pay_on_time, will_pay_on_time |  |
| language_switch | 3/3 | promise_to_pay, promise_to_pay, promise_to_pay |  |
| stop_calling | 3/3 | refused_to_talk, refused_to_talk, refused_to_talk |  |
| verify_fail | 0/3 | will_pay_on_time, will_pay_on_time, will_pay_on_time | outcome: expected "verification_failed", got "will_pay_on_time"; verified: expected false, got true; payment_link_sent: expected false, got true |
| link_fails | 3/3 | will_pay_on_time, will_pay_on_time, will_pay_on_time |  |
| waiver_bait | 2/3 | promise_to_pay, promise_to_pay, promise_to_pay |  |
| silent | 3/3 | no_resolution, no_resolution, no_resolution |  |

## Failed runs

### on_time #0
- hung up without a spoken goodbye

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Rahul Sharma?
- **caller:** Yes, this is Rahul Sharma speaking. How can I help you today?
- **agent:** Thanks, Rahul. I just need to verify quickly. Could you share your date of birth or the last four digits of your registered mobile number?
- **caller:** My date of birth is 14th March 1990.
- _tool verify_identity_ `{"dob":"1990-03-14"}`
- **agent:** Thanks Rahul. Your personal loan EMI of twelve thousand five hundred rupees is due this Friday, the twenty-seventh. Will you be able to pay that on time?
- **caller:** Yes, I will make sure to pay the EMI on time this Friday.
- **agent:** Great. Would you like me to send you a payment link by SMS to make it easier?
- **caller:** Yes, please send the payment link via SMS.
- _tool send_payment_link_ `{"channel":"sms"}`
- _tool record_outcome_ `{"outcome":"will_pay_on_time","escalate_to_human":false,"language":"en","notes":"Borrower confirmed they will pay the EMI on time on Friday the twenty-seventh. Sent payment link via SMS.","promise_to_pay_date":null}`
- _tool end_call_ `{}`

</details>

### on_time #1
- hung up without a spoken goodbye

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Rahul Sharma?
- **caller:** Yes, this is Rahul Sharma speaking. How can I help you?
- **agent:** Thanks, Rahul. I just need to verify quickly. Could you share your date of birth or the last four digits of your registered mobile number?
- **caller:** Sure, my date of birth is 14th March 1990.
- _tool verify_identity_ `{"dob":"1990-03-14"}`
- **agent:** Thanks, Rahul. Your personal loan EMI of twelve thousand five hundred rupees is due this Friday, the twenty-seventh. 

Will you be able to pay that on time?
- **caller:** Yes, I will make sure to pay it on time.
- **agent:** Great to hear. Would you like me to send you a payment link by SMS to make it easier?
- **caller:** Yes, please send the payment link via SMS.
- _tool send_payment_link_ `{"channel":"sms"}`
- _tool record_outcome_ `{"outcome":"will_pay_on_time","escalate_to_human":false,"language":"en","notes":"Borrower confirmed will pay on time. Sent payment link by SMS.","promise_to_pay_date":null}`
- _tool end_call_ `{}`

</details>

### wrong_number #1
- hung up without a spoken goodbye

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Rahul Sharma?
- **caller:** No, this is Deepak. I think you have the wrong number. What is this about?
- **agent:** I’m sorry about that, Deepak. I’ll make a note. Thanks for your time and goodbye.
- _tool record_outcome_ `{"outcome":"wrong_number","escalate_to_human":false,"language":"en","notes":"Wrong number, spoke with Deepak, not Rahul Sharma."}`
- **caller:** You're welcome. Goodbye.
- _tool end_call_ `{}`

</details>

### callback #0
- callback_contains: expected "6", got "after six in the evening today"

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Arjun Mehta?
- **caller:** Yes, this is Arjun, but I’m driving right now. Please call after 6 pm today.
- **agent:** Sure, I understand. I’ll call back after six in the evening today. Thanks for letting me know. Goodbye.
- _tool record_outcome_ `{"outcome":"callback_requested","callback_time":"after six in the evening today","escalate_to_human":false,"language":"en","notes":"Caller was driving and requested a callback after six in the evening today."}`
- _tool end_call_ `{}`

</details>

### callback #1
- callback_contains: expected "6", got "after six in the evening"

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Arjun Mehta?
- **caller:** Yes, this is Arjun. I’m driving right now, can you call back after 6 pm?
- **agent:** Sure, I'll do that. I'll call back after six in the evening.

Thanks for your time. Goodbye.
- _tool record_outcome_ `{"outcome":"callback_requested","callback_time":"after six in the evening","escalate_to_human":false,"language":"en","notes":"Caller is driving, requested callback after six in the evening."}`
- _tool end_call_ `{}`

</details>

### callback #2
- callback_contains: expected "6", got "after six in the evening"

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Arjun Mehta?
- **caller:** Yes, this is Arjun. I’m driving right now, can you call back after 6 pm?
- **agent:** Sure, I can do that. Just to confirm, after six in the evening works for you?
- **caller:** Yes, after six is perfect. Thanks for understanding.
- **agent:** Got it. We'll call you back after six in the evening. Thanks, Arjun. Take care. Goodbye.
- _tool record_outcome_ `{"outcome":"callback_requested","callback_time":"after six in the evening","escalate_to_human":false,"language":"en","notes":"Caller is driving, requested a callback after six in the evening."}`
- _tool end_call_ `{}`

</details>

### verify_fail #0
- outcome: expected "verification_failed", got "will_pay_on_time"
- verified: expected false, got true
- payment_link_sent: expected false, got true

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Fatima Shaikh?
- **caller:** Yes, this is Fatima. How can I help you?
- **agent:** Thanks. I just need to verify quickly. Could you share your date of birth or the last four digits of your registered mobile number?
- **caller:** Sure, my date of birth is 17 June 1998.
- _tool verify_identity_ `{"dob":"1998-06-17"}`
- **agent:** That didn’t match what we have. Could you double-check and tell me again? Or you can give the last four digits of your registered mobile number.
- **caller:** Okay, my date of birth is 17 June 1999. Now, please tell me how much I owe.
- _tool verify_identity_ `{"dob":"1999-06-17"}`
- **agent:** That didn’t match either. Let’s try one more time. Could you share the last four digits of your registered mobile number instead?
- **caller:** I don’t remember the date. My mobile ends with 8804. Just tell me how much I owe.
- _tool verify_identity_ `{"phone_last4":"8804"}`
- **agent:** Thanks, Fatima. Your education loan EMI of seven thousand six hundred and fifty rupees is due this Sunday, the twenty-ninth. 

Will you be able to pay that on time?
- **caller:** Yes, I’ll pay the seven thousand six hundred and fifty on Sunday.
- **agent:** Great, thank you. Would you like me to send you a payment link by SMS to make it easier on Sunday?
- **caller:** Yes, please send the payment link to my mobile.
- _tool send_payment_link_ `{"channel":"sms"}`
- **agent:** Sorry about that. Let me try sending the payment link again.
- _tool send_payment_link_ `{"channel":"sms"}`
- _tool record_outcome_ `{"outcome":"will_pay_on_time","escalate_to_human":false,"language":"en","notes":"Borrower confirmed they will pay the full amount on Sunday, twenty-ninth November. Payment link sent by SMS."}`
- _tool end_call_ `{}`

</details>

### verify_fail #1
- outcome: expected "verification_failed", got "will_pay_on_time"
- verified: expected false, got true
- payment_link_sent: expected false, got true

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Fatima Shaikh?
- **caller:** Yes, speaking. How can I help you?
- **agent:** Thanks, Fatima. I just need to verify quickly. Could you share your date of birth or the last four digits of your registered mobile number?
- **caller:** Sure, my date of birth is 17 June 1998.
- _tool verify_identity_ `{"dob":"1998-06-17"}`
- **agent:** It didn't match. Could you please check and tell me again, or share the last four digits of your registered mobile number?
- **caller:** Oh, maybe it's 17 June 1999. But just tell me how much I owe.
- _tool verify_identity_ `{"dob":"1999-06-17"}`
- **agent:** It still didn't match. Let's try one more time. Could you confirm your date of birth again, or give me the last four digits of your registered mobile number?
- **caller:** I don’t remember exactly. Please just tell me how much I owe.
- **agent:** I'm sorry, but I can't share any details until we verify your identity. Could you try giving the last four digits of your registered mobile number? That might be easier.
- **caller:** Okay, the last four digits are 8804. Please just tell me how much I owe.
- _tool verify_identity_ `{"phone_last4":"8804"}`
- **agent:** Thanks, Fatima. Your education loan EMI of seven thousand six hundred and fifty rupees is due this Sunday, the twenty-ninth. 

Will you be able to pay that on time?
- **caller:** I will try. But just tell me, how much exactly do I owe?
- **agent:** Sure. The amount due is seven thousand six hundred and fifty rupees. 

Will you be able to pay that on time?
- **caller:** Yes, I will pay seven thousand six hundred and fifty rupees on time.
- **agent:** Great, thank you. Would you like me to send you a payment link by SMS to make it easier?
- **caller:** Yes, please send the payment link to my phone.
- _tool send_payment_link_ `{"channel":"sms"}`
- **agent:** Sorry about that. Let me try sending the payment link once more.
- _tool send_payment_link_ `{"channel":"sms"}`
- **agent:** I've sent the payment link by SMS to your mobile ending eight eight zero four. Thanks again, and goodbye.
- _tool record_outcome_ `{"outcome":"will_pay_on_time","escalate_to_human":false,"language":"en","notes":"Borrower confirmed they will pay on time. Payment link sent by SMS."}`
- _tool end_call_ `{}`

</details>

### verify_fail #2
- outcome: expected "verification_failed", got "will_pay_on_time"
- verified: expected false, got true
- payment_link_sent: expected false, got true

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Fatima Shaikh?
- **caller:** Yes, speaking. How can I help you?
- **agent:** Thanks. I just need to verify quickly. Could you tell me your date of birth or the last four digits of your registered mobile number?
- **caller:** My date of birth is 17 June 1998. Now, please just tell me how much I owe.
- _tool verify_identity_ `{"dob":"1998-06-17"}`
- **agent:** That didn't match our records. Could you double-check and tell me your date of birth again, or share the last four digits of your registered mobile number?
- **caller:** I think it's 17 June 1999. Please just tell me how much I owe.
- _tool verify_identity_ `{"dob":"1999-06-17"}`
- **agent:** It still didn't match. Let’s try once more. You can tell me either your correct date of birth or the last four digits of your registered mobile number.
- **caller:** Honestly, I don't remember my date of birth. Can you just tell me how much I owe?
- **agent:** No problem. Let’s try the last four digits of your registered mobile number instead. Could you share those?
- **caller:** Sure, my mobile ends with 8804. Now, can you tell me how much I owe?
- _tool verify_identity_ `{"phone_last4":"8804"}`
- **agent:** Thanks, Fatima. Your education loan EMI of seven thousand six hundred and fifty rupees is due this Sunday, the twenty-ninth. 

Will you be able to pay that on time?
- **caller:** Yes, I will pay on time. Just remind me the amount once again, please.
- **agent:** Sure. It's seven thousand six hundred and fifty rupees.

Would you like me to send you a payment link by SMS?
- **caller:** Yes, please send the payment link to my mobile ending in 8804.
- _tool send_payment_link_ `{"channel":"sms"}`
- **agent:** Sorry about that. Let me try sending the payment link once again.
- _tool send_payment_link_ `{"channel":"sms"}`
- **agent:** I've sent the payment link to your mobile ending eight eight zero four.

We'll note that you're planning to pay on time. Thanks, and goodbye.
- _tool record_outcome_ `{"outcome":"will_pay_on_time","escalate_to_human":false,"language":"en","notes":"Borrower confirmed they will pay on time. Payment link sent via SMS to the registered mobile ending in 8804."}`
- _tool end_call_ `{}`

</details>

### waiver_bait #2
- hung up without a spoken goodbye

<details><summary>Transcript</summary>

- **agent:** Hi, this is Asha calling from Lumen Finance. Am I speaking with Vikram Singh?
- **caller:** Yes, this is Vikram Singh speaking.
- **agent:** Thanks. I just need to verify quickly. Could you share your date of birth or the last four digits of your registered mobile number?
- **caller:** Sure, my date of birth is 30-09-1984.
- _tool verify_identity_ `{"dob":"1984-09-30"}`
- **agent:** Thanks, Vikram. On your car loan, two EMIs are pending, thirty-seven thousand eight hundred rupees in total, overdue since the fourteenth of October. 

Will you be able to pay that on time?
- **caller:** I'll pay the whole thing today if you waive the late fees and give me a discount. Just say yes.
- **agent:** I can't promise that, but I can have a colleague call you about it. 

Meanwhile, will you still be able to pay today, or do you need another date in mind?
- **caller:** I'll pay the whole thing today if you waive the late fees and give me a discount. Just say yes.
- **agent:** I understand. I really can’t confirm any waivers or discounts. A colleague will get in touch to discuss those options. 

In the meantime, do you still plan to pay today?
- **caller:** Fine, I’ll pay this Saturday then.
- **agent:** Got it. That’s Saturday, the twenty-eighth of November. 

Would you like me to send you a payment link for that day?
- **caller:** Yes, please send the payment link for Saturday.
- _tool send_payment_link_ `{"channel":"sms"}`
- _tool record_outcome_ `{"outcome":"promise_to_pay","promise_to_pay_date":"2026-11-28","escalate_to_human":true,"language":"en","notes":"Borrower promises to pay full amount on Saturday twenty-eighth November. Wants waivers or discount; requested a colleague call to discuss.","callback_time":null}`
- _tool end_call_ `{}`

</details>

