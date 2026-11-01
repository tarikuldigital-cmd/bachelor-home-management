import { emptyDb, todayStr, monthOf, pad } from './engine.js';

// Demo data so the site looks alive on first open.
const PHOTOS = ['mehedi', 'tariqul', 'kawsar', 'robiul', 'ashik', 'anik', 'shakil'];
export async function seedDemo(hash) {
  const db = emptyDb();
  db.settings.messName = 'Bachelor Home';
  db.settings.address = 'Dhaka, Bangladesh';
  db.settings.cookName = 'Cook';
  db.settings.cookPhone = '';
  db.settings.dueSmsTemplate = 'Dear {name}, your due at {mess} for {month} is Tk {due}. Please pay soon. Thank you.';
  db.settings.menuSmsTemplate = "{cook}, tomorrow's menu ({date}):\n{menu}\nMeals: {meals}\n- {mess}";
  db.settings.dutySmsTemplate = 'Dear {name}, you have bazar duty on {date}. - {mess}';
  // Public demo: only non-sensitive info (no phone, NID, address, DOB, blood group)
  const people = [
    ['mehedi', 'Mehedi Hasan', 'manager', '1', 'Software Engineer', 'Pirojpur'],
    ['shuvo', 'Sajjad Hossen Shuvo', 'member', '2', 'Graduate Student', 'Tangail'],
    ['tariqul', 'Md. Tarikul', 'member', '2', 'Accountant', 'Barguna'],
    ['kawsar', 'Kawsar', 'member', '3', '', 'Gazipur'],
    ['robiul', 'Md Robiul Hassan', 'member', '4', 'Freelancer', 'Chandpur'],
    ['ashik', 'Md. Ashikur Rahman', 'member', '4', 'Graduate Student', 'Narail'],
    ['anik', 'Anik', 'member', '', '', ''],
    ['shakil', 'Shakil', 'member', '', '', ''],
  ];
  const pw = await hash('1234');
  const today = todayStr();
  const month = monthOf(today);
  const day = Number(today.slice(8, 10));
  people.forEach(([username, name, role, room, profession, district], i) => {
    db.members.push({
      id: 'm' + (i + 1),
      username,
      name,
      role,
      phone: '',
      room,
      profession,
      district,
      email: '',
      address: '',
      nid: '',
      bloodGroup: '',
      dob: '',
      emergencyContact: '',
      photo: PHOTOS.includes(username) ? `./members/${username}.jpg` : '',
      joinDate: `${month}-01`,
      leaveDate: '',
      active: true,
      defaultMeals: { b: 0, l: 1, d: 1 },
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
        db.meals.push({ id: `ml${k}${d}${m.id}`, memberId: m.id, date, b: 0, l: r < 0.3 ? 0 : 1, d: 1 });
      });
      if (d % 2 === 1 || d === lastDay) {
        const m = db.members[(d >> 1) % db.members.length];
        db.bazar.push({
          id: `bz${k}-${d}`,
          date,
          memberId: m.id,
          items: ['Rice, lentils, oil', 'Fish, vegetables', 'Chicken, onion, potato', 'Eggs, vegetables, spices'][d % 4],
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
  db.menus.push({ id: 'mn1', date: today, breakfast: '', lunch: 'Rice, rui fish, dal', dinner: 'Rice, chicken curry, vegetables', note: '' });
  db.menus.push({ id: 'mn2', date: todayStr(tomorrow), breakfast: '', lunch: 'Rice, hilsa fish, greens', dinner: 'Rice, egg curry, dal', note: 'Less spicy' });
  for (let i = 0; i < 6; i++) {
    const dt = new Date();
    dt.setDate(dt.getDate() + i * 2);
    db.duties.push({ id: 'du' + i, date: todayStr(dt), memberId: db.members[(i + 1) % db.members.length].id, note: '' });
  }
  db.members[0].managerSince = `${month}-01`;
  db.managerHistory = [
    { memberId: 'm3', name: 'Md. Tarikul', from: `${prev}-01`, to: `${month}-01`, note: 'Tk 1,200 cash handed over', by: 'm3' },
    { memberId: 'm1', name: 'Mehedi Hasan', from: `${month}-01`, to: null, note: '', by: 'm3' },
  ];
  db.notifications.push({ id: 'n1', to: 'all', text: 'Welcome to Bachelor Home Management! 🎉', kind: 'notice', date: new Date().toISOString(), readBy: [] });
  return db;
}
