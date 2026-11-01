// Bachelor Home Management — core engine
// Pure JS (no browser / node APIs). Used by the browser demo (localStorage)
// and by the Node server (JSON file). All business rules live here.

export const BILL_TYPES = ['electricity', 'wifi', 'buya', 'garbage', 'gas', 'water', 'rent', 'other'];

// Common bachelor-mess rules (manager can edit in Settings). Each rule: { en, bn }
export const DEFAULT_RULES = [
  { en: "Tell the manager tomorrow's meal on/off before 10 PM tonight.", bn: 'আগামীকালের মিল চালু/বন্ধ আজ রাত ১০টার মধ্যে ম্যানেজারকে জানান।' },
  { en: 'Pay your meal deposit by the 5th of every month.', bn: 'প্রতি মাসের ৫ তারিখের মধ্যে মিলের টাকা জমা দিন।' },
  { en: 'Pay service charges (electricity, Wi-Fi, maid, garbage, gas) by the 10th of every month.', bn: 'সার্ভিস চার্জ (বিদ্যুৎ, ওয়াইফাই, বুয়া, ময়লা, গ্যাস) প্রতি মাসের ১০ তারিখের মধ্যে পরিশোধ করুন।' },
  { en: 'Do bazar on your assigned duty day and give the receipt/cost to the manager the same day.', bn: 'নিজের বাজার ডিউটির দিনে বাজার করুন এবং সেদিনই রসিদ বা খরচের হিসাব ম্যানেজারকে দিন।' },
  { en: 'Keep the kitchen, washroom and common areas clean. Wash your own plates and glasses.', bn: 'রান্নাঘর, বাথরুম ও কমন জায়গা পরিষ্কার রাখুন। নিজের প্লেট-গ্লাস নিজে ধুয়ে রাখুন।' },
  { en: 'Save electricity, water and gas. Switch off lights, fans and AC when you leave the room.', bn: 'বিদ্যুৎ, পানি ও গ্যাস অপচয় করবেন না। রুম থেকে বের হলে লাইট-ফ্যান-এসি বন্ধ করুন।' },
  { en: 'No loud music or noise after 11 PM. Respect others’ study and sleep.', bn: 'রাত ১১টার পর জোরে গান বা শব্দ করা যাবে না। অন্যের পড়াশোনা ও ঘুমের প্রতি সম্মান রাখুন।' },
  { en: 'The main gate closes at 11:30 PM. Inform the manager if you will be late.', bn: 'রাত ১১:৩০-এ মেইন গেট বন্ধ হয়। দেরি হলে আগে ম্যানেজারকে জানান।' },
  { en: 'Inform the manager before bringing a guest. Guest meals are charged to the host. No overnight guests without permission.', bn: 'অতিথি আনার আগে ম্যানেজারকে জানান। অতিথির মিলের টাকা যিনি এনেছেন তিনি দেবেন। অনুমতি ছাড়া রাতে অতিথি রাখা যাবে না।' },
  { en: 'Smoking inside the house, drugs and gambling are strictly prohibited.', bn: 'বাসার ভিতরে ধূমপান, মাদক ও জুয়া সম্পূর্ণ নিষিদ্ধ।' },
  { en: 'Do not use anyone else’s belongings without permission.', bn: 'অনুমতি ছাড়া অন্যের জিনিস ব্যবহার করবেন না।' },
  { en: 'Throw garbage in the bin every day. Do not keep leftover food in rooms.', bn: 'প্রতিদিন ময়লা নির্দিষ্ট ঝুড়িতে ফেলুন। রুমে বাসি খাবার রাখবেন না।' },
  { en: 'Report any damage or repair need to the manager immediately.', bn: 'কোনো কিছু নষ্ট হলে বা মেরামত লাগলে সাথে সাথে ম্যানেজারকে জানান।' },
  { en: 'To leave the mess, give one month’s notice and clear all dues.', bn: 'মেস ছাড়তে চাইলে এক মাস আগে জানাতে হবে এবং সব বকেয়া পরিশোধ করতে হবে।' },
];

export function emptyDb() {
  return {
    version: 1,
    settings: {
      messName: 'Bachelor Home',
      address: '',
      currency: '৳',
      weights: { b: 0.5, l: 1, d: 1 },
      breakfastEnabled: false, // two meals a day: lunch + dinner
      mealRateRound: 'round', // 'none' | 'round' | 'ceil' — e.g. 55.91 -> 56 like the notebook
      rules: DEFAULT_RULES,
      // Only the manager updates meals, bazar, deposits & bills (personal charges)
      membersCanEditMeals: false,
      membersCanAddBazar: false,
      mealLockHour: 22, // members can edit tomorrow's meal until this hour today
      cookName: '',
      cookPhone: '',
      dueSmsTemplate:
        'Dear {name}, your due at {mess} for {month} is Tk {due}. Please pay soon. Thank you.',
      menuSmsTemplate: '{cook}, menu for {date}:\n{menu}\nMeals: {meals}\n- {mess}',
      dutySmsTemplate: 'Dear {name}, you have bazar duty on {date}. - {mess}',
    },
    members: [],
    meals: [],
    bazar: [],
    deposits: [],
    bills: [],
    menus: [],
    duties: [],
    notifications: [],
    smsLog: [],
    managerHistory: [], // [{ memberId, name, from, to, note, by }]
  };
}

// ---------- helpers ----------
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const monthOf = (date) => String(date || '').slice(0, 7);
export const pad = (n) => String(n).padStart(2, '0');
export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return todayStr(dt);
}
export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export class AppError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

function publicMember(m) {
  if (!m) return null;
  const { passwordHash, ...rest } = m;
  return rest;
}
function directoryMember(m) {
  return { id: m.id, name: m.name, photo: m.photo, room: m.room, role: m.role, active: m.active, profession: m.profession, district: m.district };
}

// which meal slots this mess cooks
export function mealSlots(settings) {
  return settings && settings.breakfastEnabled ? ['b', 'l', 'd'] : ['l', 'd'];
}
export const SLOT_KEY = { b: 'breakfast', l: 'lunch', d: 'dinner' };

export function mealTotal(entry, weights) {
  const w = weights || { b: 0.5, l: 1, d: 1 };
  return (Number(entry.b) || 0) * w.b + (Number(entry.l) || 0) * w.l + (Number(entry.d) || 0) * w.d;
}

function membersInMonth(db, month) {
  const end = `${month}-31`;
  const start = `${month}-01`;
  return db.members.filter((m) => {
    if (m.joinDate && m.joinDate > end) return false;
    if (m.leaveDate && m.leaveDate < start) return false;
    if (!m.active && !m.leaveDate) {
      // inactive without leave date: include only if they have data in month
      return db.meals.some((x) => x.memberId === m.id && monthOf(x.date) === month);
    }
    return true;
  });
}

// ---------- calculations ----------
export function effWeights(settings) {
  const w = settings.weights || { b: 0.5, l: 1, d: 1 };
  return settings.breakfastEnabled ? w : { ...w, b: 0 };
}

export function computeMonth(db, month) {
  const w = effWeights(db.settings);
  const meals = db.meals.filter((x) => monthOf(x.date) === month);
  const bazar = db.bazar.filter((x) => monthOf(x.date) === month);
  const deposits = db.deposits.filter((x) => monthOf(x.date) === month);
  const bills = db.bills.filter((x) => x.month === month);
  const members = membersInMonth(db, month);

  const totalMeals = round2(meals.reduce((s, x) => s + mealTotal(x, w), 0));
  const totalBazar = round2(bazar.reduce((s, x) => s + Number(x.amount || 0), 0));
  const rawRate = totalMeals > 0 ? totalBazar / totalMeals : 0;
  const rr = db.settings.mealRateRound;
  const mealRate = rr === 'round' ? Math.round(rawRate) : rr === 'ceil' ? Math.ceil(rawRate) : rawRate;
  const totalBills = round2(bills.reduce((s, x) => s + Number(x.amount || 0), 0));
  const totalDeposit = round2(deposits.reduce((s, x) => s + Number(x.amount || 0), 0));

  // per-member service share
  const shareOf = (memberId) => {
    let s = 0;
    for (const b of bills) {
      const ids = b.memberIds && b.memberIds.length ? b.memberIds : members.map((m) => m.id);
      if (ids.includes(memberId)) s += Number(b.amount || 0) / ids.length;
    }
    return s;
  };

  const rows = members.map((m) => {
    const myMeals = meals.filter((x) => x.memberId === m.id);
    const mealCount = round2(myMeals.reduce((s, x) => s + mealTotal(x, w), 0));
    const mealCost = round2(mealCount * mealRate);
    const myDeps = deposits.filter((x) => x.memberId === m.id);
    const mealDeposit = round2(myDeps.filter((x) => x.type !== 'service').reduce((s, x) => s + Number(x.amount), 0));
    const serviceDeposit = round2(myDeps.filter((x) => x.type === 'service').reduce((s, x) => s + Number(x.amount), 0));
    const serviceCharge = round2(shareOf(m.id));
    const bazarSpent = round2(bazar.filter((x) => x.memberId === m.id).reduce((s, x) => s + Number(x.amount), 0));
    const mealBalance = round2(mealDeposit - mealCost); // + => will get back, - => due
    const serviceBalance = round2(serviceDeposit - serviceCharge);
    const net = round2(mealBalance + serviceBalance);
    const due = round2(Math.max(0, -mealBalance) + Math.max(0, -serviceBalance));
    return {
      memberId: m.id,
      name: m.name,
      photo: m.photo,
      phone: m.phone,
      mealCount,
      mealCost,
      mealDeposit,
      serviceDeposit,
      serviceCharge,
      totalDeposit: round2(mealDeposit + serviceDeposit),
      bazarSpent,
      mealBalance,
      serviceBalance,
      net,
      due,
      receivable: round2(Math.max(0, net)),
    };
  });

  // daily meals for chart
  const days = daysInMonth(month);
  const daily = [];
  for (let d = 1; d <= days; d++) {
    const date = `${month}-${pad(d)}`;
    daily.push({
      date,
      meals: round2(meals.filter((x) => x.date === date).reduce((s, x) => s + mealTotal(x, w), 0)),
      bazar: round2(bazar.filter((x) => x.date === date).reduce((s, x) => s + Number(x.amount), 0)),
    });
  }

  const billsByType = {};
  for (const b of bills) billsByType[b.type] = round2((billsByType[b.type] || 0) + Number(b.amount));

  return {
    month,
    totalMeals,
    totalBazar,
    mealRate: round2(mealRate),
    mealRateExact: round2(rawRate),
    totalBills,
    billsByType,
    totalDeposit,
    memberCount: members.length,
    rows,
    daily,
    bills,
  };
}

// ---------- engine ----------
/**
 * adapter: {
 *   hash(pw): Promise<string>, verify(pw, hash): Promise<bool>,
 *   sign(payload): Promise<string>|string, verifyToken(token): Promise<payload|null>|payload|null,
 *   sendSms(number, message): Promise<{ok:boolean, info?:string}>
 * }
 * store: { load(): Promise<db>, save(db): Promise<void> }
 */
export function createEngine(store, adapter) {
  let chain = Promise.resolve();
  const serial = (fn) => {
    const p = chain.then(fn, fn);
    chain = p.catch(() => {});
    return p;
  };

  function notify(db, to, text, kind = 'info') {
    db.notifications.unshift({ id: uid(), to, text, kind, date: new Date().toISOString(), readBy: [] });
    if (db.notifications.length > 500) db.notifications.length = 500;
  }

  function fill(tpl, vars) {
    return String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
  }

  async function sms(db, to, number, message, kind) {
    let res = { ok: false, info: 'no number' };
    if (number) {
      try {
        res = await adapter.sendSms(number, message);
      } catch (e) {
        res = { ok: false, info: e.message };
      }
    }
    db.smsLog.unshift({ id: uid(), to, number, message, kind, ok: !!res.ok, info: res.info || '', date: new Date().toISOString() });
    if (db.smsLog.length > 1000) db.smsLog.length = 1000;
    return { ...res, number, message };
  }

  const req = (cond, msg) => {
    if (!cond) throw new AppError('bad_request', msg);
  };
  const num = (v) => {
    const n = Number(v);
    req(Number.isFinite(n), 'invalid number');
    return n;
  };
  const validDate = (d) => req(/^\d{4}-\d{2}-\d{2}$/.test(String(d)), 'invalid date');

  // action table: [role, handler]
  const A = {};
  const def = (name, role, fn) => (A[name] = { role, fn });

  // ----- public -----
  def('publicSummary', 'public', (db, p) => {
    const month = p.month || defaultMonth(db);
    const c = computeMonth(db, month);
    const today = todayStr();
    const tomorrow = addDays(today, 1);
    const menuOf = (d) => db.menus.find((x) => x.date === d) || null;
    return {
      messName: db.settings.messName,
      address: db.settings.address,
      currency: db.settings.currency,
      month,
      totalMeals: c.totalMeals,
      totalBazar: c.totalBazar,
      mealRate: c.mealRate,
      memberCount: c.memberCount,
      daily: c.daily,
      bazar: db.bazar
        .filter((x) => monthOf(x.date) === month)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((x) => ({ id: x.id, date: x.date, items: x.items, amount: x.amount, by: db.members.find((m) => m.id === x.memberId)?.name || 'Mess fund' })),
      todayMenu: menuOf(today),
      tomorrowMenu: menuOf(tomorrow),
      duties: db.duties
        .filter((x) => x.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 7)
        .map((x) => ({ date: x.date, name: db.members.find((m) => m.id === x.memberId)?.name || '' })),
      manager: (() => {
        const m = db.members.find((x) => x.role === 'manager');
        return m ? { name: m.name, photo: m.photo, since: m.managerSince || '' } : null;
      })(),
      rules: Array.isArray(db.settings.rules) ? db.settings.rules : DEFAULT_RULES,
      months: allMonths(db),
    };
  });

  // current month if it has data, otherwise the latest month that has data
  function defaultMonth(db) {
    const cur = monthOf(todayStr());
    const has = (m) => db.meals.some((x) => monthOf(x.date) === m) || db.bazar.some((x) => monthOf(x.date) === m);
    if (has(cur)) return cur;
    const list = allMonths(db).filter(has);
    return list[0] || cur;
  }

  function allMonths(db) {
    const set = new Set([monthOf(todayStr())]);
    db.meals.forEach((x) => set.add(monthOf(x.date)));
    db.bazar.forEach((x) => set.add(monthOf(x.date)));
    db.bills.forEach((x) => set.add(x.month));
    return [...set].sort().reverse();
  }

  def('login', 'public', async (db, p) => {
    const u = String(p.username || '').trim().toLowerCase();
    const m = db.members.find((x) => x.username.toLowerCase() === u || (x.phone && x.phone === u));
    if (!m || !(await adapter.verify(String(p.password || ''), m.passwordHash))) throw new AppError('bad_login', 'Wrong username or password');
    if (!m.active) throw new AppError('inactive', 'This account is inactive');
    const token = await adapter.sign({ uid: m.id, iat: Date.now() });
    return { token, user: publicMember(m) };
  });

  // ----- member -----
  def('me', 'member', (db, p, me) => ({ user: publicMember(me), settings: safeSettings(db) }));

  function safeSettings(db) {
    const s = db.settings;
    return {
      messName: s.messName,
      address: s.address,
      currency: s.currency,
      weights: s.weights,
      breakfastEnabled: !!s.breakfastEnabled,
      membersCanEditMeals: false,
      membersCanAddBazar: false,
      mealLockHour: s.mealLockHour,
    };
  }

  def('directory', 'member', (db) => db.members.map(directoryMember));

  def('memberDetail', 'member', (db, p, me) => {
    const id = p.memberId || me.id;
    if (id !== me.id && me.role !== 'manager') throw new AppError('forbidden', 'You can only view your own profile');
    const m = db.members.find((x) => x.id === id);
    if (!m) throw new AppError('not_found', 'Member not found');
    const month = p.month || defaultMonth(db);
    const c = computeMonth(db, month);
    const row = c.rows.find((r) => r.memberId === id) || null;
    const w = effWeights(db.settings);
    return {
      member: publicMember(m),
      month,
      months: allMonths(db),
      summary: { totalMeals: c.totalMeals, totalBazar: c.totalBazar, mealRate: c.mealRate, totalBills: c.totalBills, billsByType: c.billsByType, memberCount: c.memberCount },
      stats: row,
      meals: db.meals
        .filter((x) => x.memberId === id && monthOf(x.date) === month)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((x) => ({ ...x, total: mealTotal(x, w) })),
      deposits: db.deposits.filter((x) => x.memberId === id && monthOf(x.date) === month).sort((a, b) => b.date.localeCompare(a.date)),
      bazar: db.bazar.filter((x) => x.memberId === id && monthOf(x.date) === month).sort((a, b) => b.date.localeCompare(a.date)),
      bills: c.bills.map((b) => {
        const ids = b.memberIds && b.memberIds.length ? b.memberIds : c.rows.map((r) => r.memberId);
        return { ...b, share: ids.includes(id) ? round2(b.amount / ids.length) : 0, splitCount: ids.length };
      }),
      duties: db.duties.filter((x) => x.memberId === id && x.date >= todayStr()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  });

  def('notifications', 'member', (db, p, me) => {
    const list = db.notifications.filter((n) => n.to === 'all' || n.to === me.id || (n.to === 'manager' && me.role === 'manager')).slice(0, 100);
    return list.map((n) => ({ ...n, read: n.readBy.includes(me.id) }));
  });
  def('markNotificationsRead', 'member', (db, p, me) => {
    db.notifications.forEach((n) => {
      if ((n.to === 'all' || n.to === me.id || (n.to === 'manager' && me.role === 'manager')) && !n.readBy.includes(me.id)) n.readBy.push(me.id);
    });
    return { ok: true };
  }, true);

  def('changePassword', 'member', async (db, p, me) => {
    const m = db.members.find((x) => x.id === me.id);
    if (!(await adapter.verify(String(p.oldPassword || ''), m.passwordHash))) throw new AppError('bad_password', 'Old password is wrong');
    req(String(p.newPassword || '').length >= 4, 'Password must be at least 4 characters');
    m.passwordHash = await adapter.hash(String(p.newPassword));
    return { ok: true };
  });

  def('updateMyProfile', 'member', (db, p, me) => {
    const m = db.members.find((x) => x.id === me.id);
    if (p.photo !== undefined) m.photo = p.photo;
    if (p.phone !== undefined) m.phone = String(p.phone).trim();
    if (p.email !== undefined) m.email = String(p.email).trim();
    return publicMember(m);
  });

  // meals
  function sanitizeMeals(x) {
    return { b: Math.max(0, num(x.b || 0)), l: Math.max(0, num(x.l || 0)), d: Math.max(0, num(x.d || 0)) };
  }
  def('mealsForDate', 'member', (db, p, me) => {
    validDate(p.date);
    const list = db.members.filter((m) => m.active || db.meals.some((x) => x.memberId === m.id && x.date === p.date));
    const rows = list.map((m) => {
      const e = db.meals.find((x) => x.memberId === m.id && x.date === p.date);
      return { memberId: m.id, name: m.name, photo: m.photo, b: e?.b || 0, l: e?.l || 0, d: e?.d || 0, exists: !!e, defaultMeals: m.defaultMeals };
    });
    return me.role === 'manager' ? rows : rows.filter((r) => r.memberId === me.id);
  });

  function canEditMeal(db, me, memberId, date) {
    if (me.role === 'manager') return true;
    return false; // personal charges: manager only
    // eslint-disable-next-line no-unreachable
    if (memberId !== me.id) return false;
    const now = new Date();
    const today = todayStr(now);
    if (date > addDays(today, 1)) return true;
    if (date === addDays(today, 1)) return now.getHours() < Number(db.settings.mealLockHour ?? 22);
    return false;
  }

  def('setMeal', 'member', (db, p, me) => {
    validDate(p.date);
    if (!canEditMeal(db, me, p.memberId, p.date)) throw new AppError('forbidden', 'Only the manager can update meals');
    const vals = sanitizeMeals(p);
    let e = db.meals.find((x) => x.memberId === p.memberId && x.date === p.date);
    if (!e) {
      e = { id: uid(), memberId: p.memberId, date: p.date };
      db.meals.push(e);
    }
    Object.assign(e, vals, { by: me.id, updatedAt: new Date().toISOString() });
    if (vals.b + vals.l + vals.d === 0) db.meals = db.meals.filter((x) => x !== e);
    if (me.role === 'manager' && p.memberId !== me.id) {
      // silent per-cell; bulk notifies
    }
    return { ok: true };
  });

  // tick / untick one meal slot for every active member
  def('setMealsBulk', 'manager', (db, p, me) => {
    validDate(p.date);
    req(['b', 'l', 'd'].includes(p.slot), 'bad slot');
    const v = Math.max(0, num(p.value || 0));
    for (const m of db.members.filter((x) => x.active)) {
      let e = db.meals.find((x) => x.memberId === m.id && x.date === p.date);
      if (!e) {
        if (!v) continue;
        e = { id: uid(), memberId: m.id, date: p.date, b: 0, l: 0, d: 0 };
        db.meals.push(e);
      }
      e[p.slot] = v;
      e.by = me.id;
    }
    db.meals = db.meals.filter((x) => (Number(x.b) || 0) + (Number(x.l) || 0) + (Number(x.d) || 0) > 0);
    return { ok: true };
  });

  def('applyDefaultMeals', 'manager', (db, p) => {
    validDate(p.date);
    let n = 0;
    for (const m of db.members.filter((x) => x.active)) {
      if (db.meals.some((x) => x.memberId === m.id && x.date === p.date)) continue;
      const d = m.defaultMeals || { b: 0, l: 1, d: 1 };
      const b = db.settings.breakfastEnabled ? d.b : 0;
      if (b + d.l + d.d === 0) continue;
      db.meals.push({ id: uid(), memberId: m.id, date: p.date, b, l: d.l, d: d.d, by: 'template' });
      n++;
    }
    notify(db, 'all', `Meals added for ${p.date} (${n} members)`, 'meal');
    return { added: n };
  });

  // bazar
  def('listBazar', 'member', (db, p) => {
    const month = p.month || defaultMonth(db);
    return db.bazar
      .filter((x) => monthOf(x.date) === month)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((x) => ({ ...x, by: db.members.find((m) => m.id === x.memberId)?.name || 'Mess fund' }));
  });
  def('addBazar', 'member', (db, p, me) => {
    validDate(p.date);
    if (me.role !== 'manager') throw new AppError('forbidden', 'Only the manager can add bazar costs');
    const amount = num(p.amount);
    req(amount > 0, 'Enter an amount');
    const by = p.memberId === undefined ? me.id : String(p.memberId || '');
    if (by) req(db.members.some((m) => m.id === by), 'Select a member');
    const item = { id: uid(), date: p.date, memberId: by, items: String(p.items || '').slice(0, 500), amount, by: me.id, createdAt: new Date().toISOString() };
    if (p.id) {
      const e = db.bazar.find((x) => x.id === p.id);
      if (!e) throw new AppError('not_found');
      if (me.role !== 'manager' && e.memberId !== me.id) throw new AppError('forbidden');
      Object.assign(e, { date: item.date, memberId: item.memberId, items: item.items, amount });
      notify(db, 'all', `Bazar updated: ${item.date} — Tk ${amount}`, 'bazar');
      return e;
    }
    db.bazar.push(item);
    const who = db.members.find((m) => m.id === item.memberId)?.name || '';
    notify(db, 'all', `New bazar: ${who} — Tk ${amount} (${item.date})`, 'bazar');
    return item;
  });
  def('deleteBazar', 'member', (db, p, me) => {
    const e = db.bazar.find((x) => x.id === p.id);
    if (!e) throw new AppError('not_found');
    if (me.role !== 'manager' && e.memberId !== me.id) throw new AppError('forbidden');
    db.bazar = db.bazar.filter((x) => x.id !== p.id);
    return { ok: true };
  });

  // duties
  def('listDuties', 'member', (db, p) => {
    const month = p.month || defaultMonth(db);
    return db.duties
      .filter((x) => monthOf(x.date) === month)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((x) => ({ ...x, name: db.members.find((m) => m.id === x.memberId)?.name || '' }));
  });

  // menus
  def('listMenus', 'member', (db, p) => {
    const from = p.from || addDays(todayStr(), -7);
    return db.menus.filter((x) => x.date >= from).sort((a, b) => b.date.localeCompare(a.date));
  });

  // ----- manager -----
  def('overview', 'manager', (db, p) => {
    const month = p.month || defaultMonth(db);
    const c = computeMonth(db, month);
    return { ...c, months: allMonths(db), currency: db.settings.currency };
  });

  def('listMembers', 'manager', (db) => db.members.map(publicMember));

  def('saveMember', 'manager', async (db, p) => {
    const username = String(p.username || '').trim().toLowerCase();
    req(String(p.name || '').trim(), 'Enter a name');
    req(/^[a-z0-9_.]{3,30}$/.test(username), 'Username: 3-30 characters (a-z, 0-9, _ .)');
    const dup = db.members.find((x) => x.username.toLowerCase() === username && x.id !== p.id);
    if (dup) throw new AppError('duplicate', 'This username already exists');
    let m = p.id ? db.members.find((x) => x.id === p.id) : null;
    const isNew = !m;
    if (isNew) {
      req(String(p.password || '').length >= 4, 'Password must be at least 4 characters');
      m = { id: uid(), role: 'member', active: true, createdAt: new Date().toISOString(), defaultMeals: { b: db.settings.breakfastEnabled ? 1 : 0, l: 1, d: 1 } };
      db.members.push(m);
    }
    Object.assign(m, {
      name: String(p.name).trim(),
      username,
      phone: String(p.phone || '').trim(),
      email: String(p.email || '').trim(),
      room: String(p.room || '').trim(),
      profession: String(p.profession || '').trim(),
      address: String(p.address || '').trim(),
      nid: String(p.nid || '').trim(),
      emergencyContact: String(p.emergencyContact || '').trim(),
      bloodGroup: String(p.bloodGroup || '').trim(),
      dob: p.dob || '',
      district: String(p.district || '').trim(),
      joinDate: p.joinDate || m.joinDate || todayStr(),
      leaveDate: p.leaveDate || '',
      active: p.active !== undefined ? !!p.active : m.active,
    });
    if (p.photo !== undefined) m.photo = p.photo;
    if (p.defaultMeals) m.defaultMeals = sanitizeMeals(p.defaultMeals);
    if (p.password) m.passwordHash = await adapter.hash(String(p.password));
    if (isNew) notify(db, 'all', `New member joined: ${m.name}`, 'member');
    return publicMember(m);
  });

  def('deleteMember', 'manager', (db, p, me) => {
    if (p.id === me.id) throw new AppError('bad_request', 'You cannot delete yourself');
    const hasData = db.meals.some((x) => x.memberId === p.id) || db.deposits.some((x) => x.memberId === p.id) || db.bazar.some((x) => x.memberId === p.id);
    const m = db.members.find((x) => x.id === p.id);
    if (!m) throw new AppError('not_found');
    if (hasData) {
      // keep financial records intact
      m.active = false;
      m.leaveDate = m.leaveDate || todayStr();
      return { deactivated: true };
    }
    db.members = db.members.filter((x) => x.id !== p.id);
    return { deleted: true };
  });

  // ----- monthly manager handover -----
  def('handoverManager', 'manager', (db, p, me) => {
    const m = db.members.find((x) => x.id === p.memberId && x.active);
    if (!m) throw new AppError('not_found', 'Select an active member');
    if (m.id === me.id) throw new AppError('bad_request', 'You are already the manager');
    const note = String(p.note || '').slice(0, 300);
    if (p.mode === 'nextMonth') {
      const date = firstOfNextMonth(todayStr());
      db.settings.pendingHandover = { to: m.id, date, note, by: me.id, createdAt: new Date().toISOString() };
      notify(db, 'all', `Manager handover scheduled: ${m.name} will be manager from ${date}`, 'member');
      notify(db, m.id, `You will become the manager from ${date}`, 'member');
      return { scheduled: true, date };
    }
    doHandover(db, m.id, me.id, note);
    return { ok: true };
  });
  def('cancelHandover', 'manager', (db) => {
    delete db.settings.pendingHandover;
    return { ok: true };
  });
  def('managerHistory', 'member', (db) => {
    ensureHistory(db);
    const p = db.settings.pendingHandover;
    return {
      history: [...db.managerHistory].reverse(),
      pending: p ? { ...p, name: db.members.find((m) => m.id === p.to)?.name || '' } : null,
    };
  });

  def('listDeposits', 'manager', (db, p) => {
    const month = p.month || defaultMonth(db);
    return db.deposits
      .filter((x) => monthOf(x.date) === month)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((x) => ({ ...x, name: db.members.find((m) => m.id === x.memberId)?.name || '' }));
  });
  def('saveDeposit', 'manager', (db, p, me) => {
    validDate(p.date);
    const amount = num(p.amount);
    req(amount !== 0, 'Enter an amount');
    req(db.members.some((m) => m.id === p.memberId), 'Select a member');
    const type = p.type === 'service' ? 'service' : 'meal';
    if (p.id) {
      const e = db.deposits.find((x) => x.id === p.id);
      if (!e) throw new AppError('not_found');
      Object.assign(e, { date: p.date, memberId: p.memberId, amount, type, note: String(p.note || '') });
      return e;
    }
    const d = { id: uid(), date: p.date, memberId: p.memberId, amount, type, note: String(p.note || ''), by: me.id, createdAt: new Date().toISOString() };
    db.deposits.push(d);
    notify(db, p.memberId, `Your ${type === 'service' ? 'service charge' : 'meal'} deposit of Tk ${amount} was received (${p.date})`, 'deposit');
    return d;
  });
  def('deleteDeposit', 'manager', (db, p) => {
    db.deposits = db.deposits.filter((x) => x.id !== p.id);
    return { ok: true };
  });

  def('listBills', 'member', (db, p) => {
    const month = p.month || defaultMonth(db);
    return db.bills.filter((x) => x.month === month);
  });
  def('saveBill', 'manager', (db, p, me) => {
    req(/^\d{4}-\d{2}$/.test(p.month), 'Select a month');
    req(BILL_TYPES.includes(p.type), 'Select a type');
    const amount = num(p.amount);
    req(amount > 0, 'Enter an amount');
    const data = { month: p.month, type: p.type, amount, note: String(p.note || ''), memberIds: Array.isArray(p.memberIds) ? p.memberIds : [] };
    if (p.id) {
      const e = db.bills.find((x) => x.id === p.id);
      if (!e) throw new AppError('not_found');
      Object.assign(e, data);
      return e;
    }
    const b = { id: uid(), ...data, by: me.id, createdAt: new Date().toISOString() };
    db.bills.push(b);
    notify(db, 'all', `Service charge added (${p.month})`, 'bill');
    return b;
  });
  def('deleteBill', 'manager', (db, p) => {
    db.bills = db.bills.filter((x) => x.id !== p.id);
    return { ok: true };
  });

  def('saveDuty', 'manager', (db, p) => {
    validDate(p.date);
    req(db.members.some((m) => m.id === p.memberId), 'Select a member');
    db.duties = db.duties.filter((x) => x.date !== p.date);
    const d = { id: uid(), date: p.date, memberId: p.memberId, note: String(p.note || '') };
    db.duties.push(d);
    notify(db, p.memberId, `You have bazar duty on ${p.date}`, 'duty');
    return d;
  });
  def('deleteDuty', 'manager', (db, p) => {
    db.duties = db.duties.filter((x) => x.id !== p.id);
    return { ok: true };
  });
  def('autoDuties', 'manager', (db, p) => {
    req(/^\d{4}-\d{2}$/.test(p.month), 'Select a month');
    const active = db.members.filter((m) => m.active);
    req(active.length, 'No active members');
    const every = Math.max(1, Number(p.everyDays) || 2);
    const days = daysInMonth(p.month);
    db.duties = db.duties.filter((x) => monthOf(x.date) !== p.month);
    let i = 0;
    for (let d = 1; d <= days; d += every) {
      db.duties.push({ id: uid(), date: `${p.month}-${pad(d)}`, memberId: active[i % active.length].id, note: '' });
      i++;
    }
    notify(db, 'all', `Bazar duty roster created for ${p.month}`, 'duty');
    return { created: i };
  });
  def('sendDutyReminder', 'manager', async (db, p) => {
    const d = db.duties.find((x) => x.id === p.id);
    if (!d) throw new AppError('not_found');
    const m = db.members.find((x) => x.id === d.memberId);
    const msg = fill(db.settings.dutySmsTemplate, { name: m.name, date: d.date, mess: db.settings.messName });
    notify(db, m.id, `Reminder: you have bazar duty on ${d.date}`, 'duty');
    return sms(db, m.id, m.phone, msg, 'duty');
  });

  def('saveMenu', 'manager', (db, p, me) => {
    validDate(p.date);
    let e = db.menus.find((x) => x.date === p.date);
    const data = { breakfast: String(p.breakfast || ''), lunch: String(p.lunch || ''), dinner: String(p.dinner || ''), note: String(p.note || '') };
    if (!e) {
      e = { id: uid(), date: p.date, ...data, by: me.id };
      db.menus.push(e);
    } else Object.assign(e, data);
    notify(db, 'all', `Menu updated for ${p.date}`, 'menu');
    return e;
  });
  def('deleteMenu', 'manager', (db, p) => {
    db.menus = db.menus.filter((x) => x.id !== p.id);
    return { ok: true };
  });

  function menuText(db, menu) {
    const lines = [];
    if (menu.breakfast) lines.push(`Breakfast: ${menu.breakfast}`);
    if (menu.lunch) lines.push(`Lunch: ${menu.lunch}`);
    if (menu.dinner) lines.push(`Dinner: ${menu.dinner}`);
    if (menu.note) lines.push(`Note: ${menu.note}`);
    return lines.join('\n');
  }
  function mealCountsFor(db, date) {
    const w = { b: 0, l: 0, d: 0 };
    db.meals.filter((x) => x.date === date).forEach((x) => {
      w.b += Number(x.b) || 0;
      w.l += Number(x.l) || 0;
      w.d += Number(x.d) || 0;
    });
    return w;
  }
  function mealCountText(db, c) {
    const total = (db.settings.breakfastEnabled ? c.b : 0) + c.l + c.d;
    return (db.settings.breakfastEnabled ? `Breakfast ${c.b}, ` : '') + `Lunch ${c.l}, Dinner ${c.d} (Total ${total})`;
  }
  def('menuSmsPreview', 'manager', (db, p) => {
    const menu = db.menus.find((x) => x.date === p.date);
    if (!menu) throw new AppError('not_found', 'No menu for this date');
    const c = mealCountsFor(db, p.date);
    const message = fill(db.settings.menuSmsTemplate, {
      cook: db.settings.cookName || 'Cook',
      date: p.date,
      menu: menuText(db, menu),
      meals: mealCountText(db, c),
      mess: db.settings.messName,
    });
    return { number: db.settings.cookPhone, message };
  });
  def('sendMenuToCook', 'manager', async (db, p) => {
    const menu = db.menus.find((x) => x.date === p.date);
    if (!menu) throw new AppError('not_found', 'No menu for this date');
    req(db.settings.cookPhone, 'Add the cook phone number in Settings');
    const c = mealCountsFor(db, p.date);
    const message =
      p.message ||
      fill(db.settings.menuSmsTemplate, {
        cook: db.settings.cookName || 'Cook',
        date: p.date,
        menu: menuText(db, menu),
        meals: mealCountText(db, c),
        mess: db.settings.messName,
      });
    const r = await sms(db, 'cook', db.settings.cookPhone, message, 'menu');
    menu.sentAt = new Date().toISOString();
    menu.sentOk = r.ok;
    return r;
  });

  def('dueList', 'manager', (db, p) => {
    const month = p.month || defaultMonth(db);
    const c = computeMonth(db, month);
    return c.rows
      .filter((r) => r.due > 0)
      .map((r) => ({
        ...r,
        message: fill(db.settings.dueSmsTemplate, { name: r.name, mess: db.settings.messName, month, due: Math.ceil(r.due), meal: Math.ceil(Math.max(0, -r.mealBalance)), service: Math.ceil(Math.max(0, -r.serviceBalance)) }),
      }));
  });
  def('sendDueSms', 'manager', async (db, p) => {
    const month = p.month || defaultMonth(db);
    const c = computeMonth(db, month);
    const results = [];
    for (const id of p.memberIds || []) {
      const r = c.rows.find((x) => x.memberId === id);
      if (!r || r.due <= 0) continue;
      const message = fill(p.template || db.settings.dueSmsTemplate, {
        name: r.name,
        mess: db.settings.messName,
        month,
        due: Math.ceil(r.due),
        meal: Math.ceil(Math.max(0, -r.mealBalance)),
        service: Math.ceil(Math.max(0, -r.serviceBalance)),
      });
      notify(db, id, `Due alert: your due for ${month} is Tk ${Math.ceil(r.due)}`, 'due');
      results.push({ memberId: id, name: r.name, ...(await sms(db, id, r.phone, message, 'due')) });
    }
    return results;
  });
  def('sendCustomSms', 'manager', async (db, p) => {
    const msg = String(p.message || '').trim();
    req(msg, 'Write a message');
    const results = [];
    for (const id of p.memberIds || []) {
      const m = db.members.find((x) => x.id === id);
      if (!m) continue;
      results.push({ memberId: id, name: m.name, ...(await sms(db, id, m.phone, msg.replace(/\{name\}/g, m.name), 'custom')) });
    }
    if (p.alsoNotify) (p.memberIds || []).forEach((id) => notify(db, id, msg, 'info'));
    return results;
  });
  def('smsLog', 'manager', (db) => db.smsLog.slice(0, 200));

  def('broadcast', 'manager', (db, p) => {
    const msg = String(p.message || '').trim();
    req(msg, 'Write a message');
    notify(db, 'all', msg, 'notice');
    return { ok: true };
  });

  def('getSettings', 'manager', (db) => ({ ...db.settings, rules: Array.isArray(db.settings.rules) ? db.settings.rules : DEFAULT_RULES }));
  def('saveSettings', 'manager', (db, p) => {
    const s = db.settings;
    const keys = ['mealRateRound', 'breakfastEnabled', 'messName', 'address', 'currency', 'cookName', 'cookPhone', 'dueSmsTemplate', 'menuSmsTemplate', 'dutySmsTemplate', 'mealLockHour'];
    keys.forEach((k) => {
      if (p[k] !== undefined) s[k] = p[k];
    });
    if (Array.isArray(p.rules)) s.rules = p.rules.map((r) => ({ en: String(r.en || '').slice(0, 300), bn: String(r.bn || '').slice(0, 300) })).filter((r) => r.en || r.bn);
    if (p.weights) s.weights = { b: num(p.weights.b), l: num(p.weights.l), d: num(p.weights.d) };
    return s;
  });

  def('exportData', 'manager', (db) => {
    const copy = JSON.parse(JSON.stringify(db));
    return copy;
  });
  def('importData', 'manager', (db, p) => {
    req(p.data && Array.isArray(p.data.members) && p.data.members.length, 'Invalid backup file');
    const base = emptyDb();
    for (const k of Object.keys(base)) db[k] = p.data[k] ?? base[k];
    db.settings = { ...base.settings, ...(p.data.settings || {}) };
    return { ok: true };
  });

  function firstOfNextMonth(d) {
    const [y, m] = d.split('-').map(Number);
    return m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
  }
  function ensureHistory(db) {
    if (!Array.isArray(db.managerHistory)) db.managerHistory = [];
    const cur = db.members.find((m) => m.role === 'manager');
    const open = db.managerHistory.find((h) => !h.to);
    if (cur && (!open || open.memberId !== cur.id)) {
      if (open) open.to = todayStr();
      db.managerHistory.push({ memberId: cur.id, name: cur.name, from: cur.managerSince || todayStr(), to: null, note: '', by: '' });
      return true;
    }
    return false;
  }
  function doHandover(db, toId, byId, note) {
    ensureHistory(db);
    const today = todayStr();
    const to = db.members.find((m) => m.id === toId && m.active);
    if (!to) return false;
    db.members.forEach((m) => {
      if (m.role === 'manager') m.role = 'member';
    });
    to.role = 'manager';
    to.managerSince = today;
    const open = db.managerHistory.find((h) => !h.to);
    if (open) open.to = today;
    db.managerHistory.push({ memberId: to.id, name: to.name, from: today, to: null, note, by: byId });
    delete db.settings.pendingHandover;
    notify(db, 'all', `Manager handover: ${to.name} is now the manager`, 'member');
    return true;
  }
  // apply a scheduled handover once its date arrives
  function applyPending(db) {
    const p = db.settings.pendingHandover;
    let changed = ensureHistory(db);
    if (p && todayStr() >= p.date) changed = doHandover(db, p.to, p.by, p.note) || changed;
    return changed;
  }

  const READ_ONLY = new Set([
    'publicSummary', 'managerHistory', 'me', 'directory', 'memberDetail', 'notifications', 'mealsForDate', 'listBazar', 'listDuties', 'listMenus',
    'overview', 'listMembers', 'listDeposits', 'listBills', 'menuSmsPreview', 'dueList', 'smsLog', 'getSettings', 'exportData',
  ]);

  async function call(action, payload = {}, token = null) {
    const a = A[action];
    if (!a) throw new AppError('unknown_action', 'Unknown action: ' + action);
    return serial(async () => {
      const db = await store.load();
      const autoChanged = applyPending(db);
      let me = null;
      if (a.role !== 'public') {
        const t = token ? await adapter.verifyToken(token) : null;
        me = t ? db.members.find((m) => m.id === t.uid) : null;
        if (!me || !me.active) throw new AppError('unauthorized', 'Please log in again');
        if (a.role === 'manager' && me.role !== 'manager') throw new AppError('forbidden', 'Only the manager can do this');
      }
      const result = await a.fn(db, payload || {}, me);
      if (autoChanged || !READ_ONLY.has(action)) await store.save(db);
      return JSON.parse(JSON.stringify(result ?? null));
    });
  }

  return { call, actions: Object.keys(A) };
}
