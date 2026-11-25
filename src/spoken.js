// Turn amounts and dates into the words a person would say.
// The model gets these phrases from tools, so it never reads digits off a form.

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const HI = ('शून्य एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस ' +
  'इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस ' +
  'इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरेपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ ' +
  'इकसठ बासठ तिरेसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उनासी अस्सी ' +
  'इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानबे बानबे तिरानबे चौरानबे पंचानबे छियानबे सत्तानबे अट्ठानबे निन्यानबे').split(' ');
const HI_MONTHS = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
const HI_DAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

const en99 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''));
const en999 = (n) => {
  const h = Math.floor(n / 100), r = n % 100;
  if (!h) return en99(r);
  return ONES[h] + ' hundred' + (r ? ' and ' + en99(r) : '');
};

// Indian system: crore, lakh, thousand.
function split(n) {
  n = Math.round(n);
  return { crore: Math.floor(n / 1e7), lakh: Math.floor((n % 1e7) / 1e5), thousand: Math.floor((n % 1e5) / 1000), rest: n % 1000 };
}

export function wordsEn(n) {
  if (Math.round(n) === 0) return 'zero';
  const { crore, lakh, thousand, rest } = split(n);
  const parts = [];
  if (crore) parts.push(en999(crore) + ' crore');
  if (lakh) parts.push(en99(lakh) + ' lakh');
  if (thousand) parts.push(en99(thousand) + ' thousand');
  if (rest) parts.push(parts.length && rest < 100 ? 'and ' + en99(rest) : en999(rest));
  return parts.join(' ');
}

export function wordsHi(n) {
  if (Math.round(n) === 0) return HI[0];
  const { crore, lakh, thousand, rest } = split(n);
  const parts = [];
  if (crore) parts.push(wordsHi(crore) + ' करोड़');
  if (lakh) parts.push(HI[lakh] + ' लाख');
  if (thousand) parts.push(HI[thousand] + ' हज़ार');
  if (rest >= 100) parts.push(HI[Math.floor(rest / 100)] + ' सौ');
  if (rest % 100) parts.push(HI[rest % 100]);
  return parts.join(' ');
}

export const rupeesEn = (n) => `${wordsEn(n)} ${Math.round(n) === 1 ? 'rupee' : 'rupees'}`;
export const rupeesHi = (n) => `${wordsHi(n)} रुपये`;

export function ordinalEn(n) {
  const special = { 1: 'first', 2: 'second', 3: 'third', 5: 'fifth', 8: 'eighth', 9: 'ninth', 12: 'twelfth' };
  if (special[n]) return special[n];
  if (n < 20) return ONES[n] + 'th';
  if (n % 10 === 0) return TENS[n / 10].replace(/y$/, 'ieth');
  return TENS[Math.floor(n / 10)] + '-' + ordinalEn(n % 10);
}

// Dates are plain 'YYYY-MM-DD' strings handled in UTC, so time zones never shift a day.
export const parseIso = (iso) => new Date(iso + 'T00:00:00Z');
export const toIso = (d) => d.toISOString().slice(0, 10);
export const addDays = (iso, n) => toIso(new Date(parseIso(iso).getTime() + n * 86400000));
export const daysBetween = (a, b) => Math.round((parseIso(b) - parseIso(a)) / 86400000);
export const weekday = (iso) => DAYS[parseIso(iso).getUTCDay()];

export function todayIso(tz = 'Asia/Kolkata') {
  if (process.env.LUMEN_TODAY) return process.env.LUMEN_TODAY;
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}

// "tomorrow", "this Friday, the fifth", "the fifth of December"
export function dateEn(iso, today) {
  const d = parseIso(iso), t = parseIso(today), diff = daysBetween(today, iso);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  const day = 'the ' + ordinalEn(d.getUTCDate());
  if (diff > 1 && diff < 7) return `this ${DAYS[d.getUTCDay()]}, ${day}`;
  const sameMonth = d.getUTCMonth() === t.getUTCMonth() && d.getUTCFullYear() === t.getUTCFullYear();
  return sameMonth ? day : `${day} of ${MONTHS[d.getUTCMonth()]}`;
}

export function dateHi(iso, today) {
  const d = parseIso(iso), diff = daysBetween(today, iso);
  if (diff === 0) return 'आज';
  if (diff === 1 || diff === -1) return 'कल';
  if (diff === 2) return 'परसों';
  return `${HI[d.getUTCDate()]} ${HI_MONTHS[d.getUTCMonth()]}`;
}

export const daysEn = (n) => `${wordsEn(n)} ${n === 1 ? 'day' : 'days'}`;
export const daysHi = (n) => `${wordsHi(n)} दिन`;

// Next N days, so the model can turn "next Friday" into a real date without guessing.
export function calendar(today, n = 21) {
  return Array.from({ length: n }, (_, i) => {
    const iso = addDays(today, i);
    const d = parseIso(iso);
    return `${iso} = ${DAYS[d.getUTCDay()]} ${ordinalEn(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} (${HI_DAYS[d.getUTCDay()]})`;
  }).join('\n');
}
