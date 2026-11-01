import { n2, getLang } from './i18n.js';

export function money(v, cur = '৳') {
  const n = Number(v) || 0;
  const s = Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return (n < 0 ? '-' : '') + cur + ' ' + n2(s);
}
export const num = (v) => n2((Math.round((Number(v) || 0) * 100) / 100).toString());

const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function monthLabel(m) {
  if (!m) return '';
  const [y, mo] = m.split('-').map(Number);
  return getLang() === 'bn' ? `${BN_MONTHS[mo - 1]} ${n2(y)}` : `${EN_MONTHS[mo - 1]} ${y}`;
}
export function dateLabel(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return getLang() === 'bn' ? `${n2(day)} ${BN_MONTHS[m - 1]}` : `${day} ${EN_MONTHS[m - 1].slice(0, 3)}`;
}
export function timeAgo(iso) {
  const dt = new Date(iso);
  return dt.toLocaleString(getLang() === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// resize image file to a square-ish JPEG data URL (keeps DB small)
export function resizeImage(file, max = 320) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const s = Math.min(img.width, img.height);
        const c = document.createElement('canvas');
        c.width = c.height = Math.min(max, s);
        const ctx = c.getContext('2d');
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function smsLink(number, message) {
  const ua = navigator.userAgent || '';
  const sep = /iPhone|iPad|Mac/i.test(ua) ? '&' : '?';
  return `sms:${number}${sep}body=${encodeURIComponent(message)}`;
}

export function download(filename, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
