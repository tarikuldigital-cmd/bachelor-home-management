import { emptyDb, todayStr, monthOf, pad } from './engine.js';

// Demo data so the site looks alive on first open.
export async function seedDemo(hash) {
  const db = emptyDb();
  db.settings.messName = 'Bachelor Home';
  db.settings.address = 'ধানমন্ডি, ঢাকা';
  db.settings.cookName = 'রহিম বাবুর্চি';
  db.settings.cookPhone = '01700000000';
  const people = [
    ['manager', 'তারিকুল ইসলাম', 'manager', '01711000001', '101', 'ম্যানেজার'],
    ['rahim', 'রহিম উদ্দিন', 'member', '01711000002', '101', 'চাকরিজীবী'],
    ['karim', 'করিম হাসান', 'member', '01711000003', '102', 'ছাত্র'],
    ['sakib', 'সাকিব আহমেদ', 'member', '01711000004', '102', 'ছাত্র'],
    ['nayeem', 'নাঈম হোসেন', 'member', '01711000005', '103', 'ব্যবসায়ী'],
    ['fahim', 'ফাহিম রহমান', 'member', '01711000006', '103', 'চাকরিজীবী'],
  ];
  const pw = await hash('1234');
  const today = todayStr();
  const month = monthOf(today);
  const day = Number(today.slice(8, 10));
  people.forEach(([username, name, role, phone, room, profession], i) => {
    db.members.push({
      id: 'm' + (i + 1),
      username,
      name,
      role,
      phone,
      room,
      profession,
      email: '',
      address: '',
      nid: '',
      emergencyContact: '',
      photo: '',
      joinDate: `${month}-01`,
      leaveDate: '',
      active: true,
      defaultMeals: { b: 1, l: 1, d: 1 },
      passwordHash: pw,
      createdAt: new Date().toISOString(),
    });
  });
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const prev = (() => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  })();
  const plan = [
    [prev, new Date(Number(prev.slice(0, 4)), Number(prev.slice(5, 7)), 0).getDate(), 3500],
    [month, day, 2500],
  ];
  plan.forEach(([mo, lastDay, dep], k) => {
    for (let d = 1; d <= lastDay; d++) {
      const date = `${mo}-${pad(d)}`;
      db.members.forEach((m) => {
        const r = rnd();
        if (r < 0.08) return;
        db.meals.push({ id: `ml${k}${d}${m.id}`, memberId: m.id, date, b: 1, l: r < 0.3 ? 0 : 1, d: 1 });
      });
      if (d % 2 === 1 || d === lastDay) {
        const m = db.members[(d >> 1) % db.members.length];
        db.bazar.push({
          id: `bz${k}-${d}`,
          date,
          memberId: m.id,
          items: ['চাল, ডাল, তেল', 'মাছ, সবজি', 'মুরগি, পেঁয়াজ, আলু', 'ডিম, সবজি, মসলা'][d % 4],
          amount: 900 + Math.round(rnd() * 900),
        });
      }
    }
    db.members.forEach((m, i) => {
      db.deposits.push({ id: `dp${k}-${i}`, date: `${mo}-01`, memberId: m.id, amount: i === 2 ? dep - 1500 : dep, type: 'meal', note: '' });
      if (i % 2 === 0 || k === 0) db.deposits.push({ id: `ds${k}-${i}`, date: `${mo}-01`, memberId: m.id, amount: 1330, type: 'service', note: '' });
    });
    [
      ['electricity', 2400],
      ['wifi', 1200],
      ['buya', 3000],
      ['garbage', 300],
      ['gas', 1080],
    ].forEach(([type, amount], i) => db.bills.push({ id: `bl${k}-${i}`, month: mo, type, amount, note: '', memberIds: [] }));
  });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  db.menus.push({ id: 'mn1', date: today, breakfast: 'খিচুড়ি, ডিম ভাজি', lunch: 'ভাত, রুই মাছ, ডাল', dinner: 'ভাত, মুরগির মাংস, সবজি', note: '' });
  db.menus.push({ id: 'mn2', date: todayStr(tomorrow), breakfast: 'পরোটা, ডাল', lunch: 'ভাত, ইলিশ মাছ, শাক', dinner: 'ভাত, ডিম কারি, ডাল', note: 'ঝাল কম' });
  for (let i = 0; i < 6; i++) {
    const dt = new Date();
    dt.setDate(dt.getDate() + i * 2);
    db.duties.push({ id: 'du' + i, date: todayStr(dt), memberId: db.members[(i + 1) % db.members.length].id, note: '' });
  }
  db.notifications.push({ id: 'n1', to: 'all', text: 'Bachelor Home Management-এ স্বাগতম! 🎉', kind: 'notice', date: new Date().toISOString(), readBy: [] });
  return db;
}
