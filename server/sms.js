// SMS gateway. Default: BulkSMSBD (bulksmsbd.net) — popular in Bangladesh.
// Any other HTTP gateway works by setting SMS_URL_TEMPLATE with {number} and {message}.
//
// .env options:
//   SMS_PROVIDER=bulksmsbd | template | none
//   SMS_API_KEY=xxxxx
//   SMS_SENDER_ID=8809XXXXXXXXX
//   SMS_URL_TEMPLATE=https://example.com/send?key=XXX&to={number}&msg={message}

export function normalizeBdNumber(n) {
  let d = String(n || '').replace(/[^\d]/g, '');
  if (d.startsWith('880')) return d;
  if (d.startsWith('0')) return '88' + d;
  if (d.length === 10 && d.startsWith('1')) return '880' + d;
  return d;
}

export async function sendSms(number, message) {
  const provider = (process.env.SMS_PROVIDER || 'bulksmsbd').toLowerCase();
  const to = normalizeBdNumber(number);
  if (!to || to.length < 11) return { ok: false, info: 'invalid number' };

  try {
    if (provider === 'none') {
      console.log(`[SMS disabled] ${to}: ${message}`);
      return { ok: false, info: 'SMS disabled' };
    }
    if (provider === 'template') {
      const tpl = process.env.SMS_URL_TEMPLATE;
      if (!tpl) return { ok: false, info: 'SMS_URL_TEMPLATE missing' };
      const url = tpl.replace('{number}', encodeURIComponent(to)).replace('{message}', encodeURIComponent(message));
      const r = await fetch(url);
      const text = await r.text();
      return { ok: r.ok, info: text.slice(0, 200) };
    }
    // BulkSMSBD
    const key = process.env.SMS_API_KEY;
    const sender = process.env.SMS_SENDER_ID;
    if (!key || !sender) return { ok: false, info: 'SMS_API_KEY / SMS_SENDER_ID missing in .env' };
    const body = new URLSearchParams({ api_key: key, type: 'text', number: to, senderid: sender, message });
    const r = await fetch('http://bulksmsbd.net/api/smsapi', { method: 'POST', body });
    const text = await r.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      /* not json */
    }
    // BulkSMSBD returns response_code 202 on success
    const ok = r.ok && (data.response_code === 202 || /202|success/i.test(text));
    return { ok, info: data.success_message || data.error_message || text.slice(0, 200) };
  } catch (e) {
    return { ok: false, info: e.message };
  }
}
