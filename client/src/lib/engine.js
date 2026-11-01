// Bachelor Home Management — core engine
// Pure JS (no browser / node APIs). Used by the browser demo (localStorage)
// and by the Node server (JSON file). All business rules live here.

export const BILL_TYPES = ['electricity', 'wifi', 'buya', 'garbage', 'gas', 'water', 'rent', 'other'];

export function emptyDb() {
  return {
    version: 1,
    settings: {
      messName: 'Bachelor Home',
      address: '',
      currency: '৳',
      weights: { b: 0.5, l: 1, d: 1 },
      membersCanEditMeals: true,
      membersCanAddBazar: true,
      mealLockHour: 22, // members can edit tomorrow's meal until this hour today
      cookName: '',
      cookPhone: '',
      dueSmsTemplate:
        'প্রিয় {name}, {mess} এ {month} মাসে আপনার বকেয়া {due} টাকা। অনুগ্রহ করে দ্রুত পরিশোধ করুন। ধন্যবাদ।',
      menuSmsTemplate: '{cook}, আগামীকাল ({date}) এর মেনু:\n{menu}\nমোট মিল: {meals}\n- {mess}',
      dutySmsTemplate: 'প্রিয় {name}, {date} তারিখে আপনার বাজার ডিউটি। - {mess}',
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
  return { id: m.id, name: m.name, photo: m.photo, room: m.room, role: m.role, active: m.active };
}

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
export function computeMonth(db, month) {
  const w = db.settings.weights;
  const meals = db.meals.filter((x) => monthOf(x.date) === month);
  const bazar = db.bazar.filter((x) => monthOf(x.date) === month);
  const deposits = db.deposits.filter((x) => monthOf(x.date) === month);
  const bills = db.bills.filter((x) => x.month === month);
  const members = membersInMonth(db, month);

  const totalMeals = round2(meals.reduce((s, x) => s + mealTotal(x, w), 0));
  const totalBazar = round2(bazar.reduce((s, x) => s + Number(x.amount || 0), 0));
  const mealRate = totalMeals > 0 ? totalBazar / totalMeals : 0;
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
    mealRateExact: mealRate,
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
    const month = p.month || monthOf(todayStr());
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
        .map((x) => ({ id: x.id, date: x.date, items: x.items, amount: x.amount, by: db.members.find((m) => m.id === x.memberId)?.name || '' })),
      todayMenu: menuOf(today),
      tomorrowMenu: menuOf(tomorrow),
      duties: db.duties
        .filter((x) => x.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 7)
        .map((x) => ({ date: x.date, name: db.members.find((m) => m.id === x.memberId)?.name || '' })),
      months: allMonths(db),
    };
  });

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
    if (!m || !(await adapter.verify(String(p.password || ''), m.passwordHash))) throw new AppError('bad_login', 'ভুল ইউজারনেম বা পাসওয়ার্ড');
    if (!m.active) throw new AppError('inactive', 'এই অ্যাকাউন্টটি নিষ্ক্রিয়');
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
      membersCanEditMeals: s.membersCanEditMeals,
      membersCanAddBazar: s.membersCanAddBazar,
      mealLockHour: s.mealLockHour,
    };
  }

  def('directory', 'member', (db) => db.members.map(directoryMember));

  def('memberDetail', 'member', (db, p, me) => {
    const id = p.memberId || me.id;
    if (id !== me.id && me.role !== 'manager') throw new AppError('forbidden', 'শুধু নিজের প্রোফাইল দেখা যাবে');
    const m = db.members.find((x) => x.id === id);
    if (!m) throw new AppError('not_found', 'মেম্বার পাওয়া যায়নি');
    const month = p.month || monthOf(todayStr());
    const c = computeMonth(db, month);
    const row = c.rows.find((r) => r.memberId === id) || null;
    const w = db.settings.weights;
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
    if (!(await adapter.verify(String(p.oldPassword || ''), m.passwordHash))) throw new AppError('bad_password', 'পুরনো পাসওয়ার্ড ভুল');
    req(String(p.newPassword || '').length >= 4, 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে');
    m.passwordHash = await adapter.hash(String(p.newPassword));
    return { ok: true };
  });

  def('updateMyProfile', 'member', (db, p, me) => {
    const m = db.members.find((x) => x.id === me.id);
    if (p.photo !== undefined) m.photo = p.photo;
    if (p.phone !== undefined) m.phone = String(p.phone).trim();
    if (p.email !== undefined) m.email = String(p.email).trim();
    if (p.defaultMeals) m.defaultMeals = sanitizeMeals(p.defaultMeals);
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
    if (memberId !== me.id || !db.settings.membersCanEditMeals) return false;
    const now = new Date();
    const today = todayStr(now);
    if (date > addDays(today, 1)) return true;
    if (date === addDays(today, 1)) return now.getHours() < Number(db.settings.mealLockHour ?? 22);
    return false;
  }

  def('setMeal', 'member', (db, p, me) => {
    validDate(p.date);
    if (!canEditMeal(db, me, p.memberId, p.date)) throw new AppError('forbidden', 'এই মিল এখন পরিবর্তন করা যাবে না');
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

  def('applyDefaultMeals', 'manager', (db, p) => {
    validDate(p.date);
    let n = 0;
    for (const m of db.members.filter((x) => x.active)) {
      if (db.meals.some((x) => x.memberId === m.id && x.date === p.date)) continue;
      const d = m.defaultMeals || { b: 1, l: 1, d: 1 };
      if (d.b + d.l + d.d === 0) continue;
      db.meals.push({ id: uid(), memberId: m.id, date: p.date, b: d.b, l: d.l, d: d.d, by: 'template' });
      n++;
    }
    notify(db, 'all', `${p.date} তারিখের মিল যোগ করা হয়েছে (${n} জন)`, 'meal');
    return { added: n };
  });

  // bazar
  def('listBazar', 'member', (db, p) => {
    const month = p.month || monthOf(todayStr());
    return db.bazar
      .filter((x) => monthOf(x.date) === month)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((x) => ({ ...x, by: db.members.find((m) => m.id === x.memberId)?.name || '' }));
  });
  def('addBazar', 'member', (db, p, me) => {
    validDate(p.date);
    if (me.role !== 'manager' && (!db.settings.membersCanAddBazar || p.memberId !== me.id)) throw new AppError('forbidden', 'অনুমতি নেই');
    const amount = num(p.amount);
    req(amount > 0, 'টাকার পরিমাণ দিন');
    const item = { id: uid(), date: p.date, memberId: p.memberId || me.id, items: String(p.items || '').slice(0, 500), amount, by: me.id, createdAt: new Date().toISOString() };
    if (p.id) {
      const e = db.bazar.find((x) => x.id === p.id);
      if (!e) throw new AppError('not_found');
      if (me.role !== 'manager' && e.memberId !== me.id) throw new AppError('forbidden');
      Object.assign(e, { date: item.date, memberId: item.memberId, items: item.items, amount });
      notify(db, 'all', `বাজার খরচ আপডেট: ${item.date} — ${amount} টাকা`, 'bazar');
      return e;
    }
    db.bazar.push(item);
    const who = db.members.find((m) => m.id === item.memberId)?.name || '';
    notify(db, 'all', `নতুন বাজার: ${who} — ${amount} টাকা (${item.date})`, 'bazar');
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
    const month = p.month || monthOf(todayStr());
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
    const month = p.month || monthOf(todayStr());
    const c = computeMonth(db, month);
    return { ...c, months: allMonths(db), currency: db.settings.currency };
  });

  def('listMembers', 'manager', (db) => db.members.map(publicMember));

  def('saveMember', 'manager', async (db, p) => {
    const username = String(p.username || '').trim().toLowerCase();
    req(String(p.name || '').trim(), 'নাম দিন');
    req(/^[a-z0-9_.]{3,30}$/.test(username), 'ইউজারনেম ৩-৩০ অক্ষর (a-z, 0-9, _ .)');
    const dup = db.members.find((x) => x.username.toLowerCase() === username && x.id !== p.id);
    if (dup) throw new AppError('duplicate', 'এই ইউজারনেম আগে থেকেই আছে');
    let m = p.id ? db.members.find((x) => x.id === p.id) : null;
    const isNew = !m;
    if (isNew) {
      req(String(p.password || '').length >= 4, 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষর');
      m = { id: uid(), role: 'member', active: true, createdAt: new Date().toISOString(), defaultMeals: { b: 1, l: 1, d: 1 } };
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
      joinDate: p.joinDate || m.joinDate || todayStr(),
      leaveDate: p.leaveDate || '',
      active: p.active !== undefined ? !!p.active : m.active,
    });
    if (p.photo !== undefined) m.photo = p.photo;
    if (p.defaultMeals) m.defaultMeals = sanitizeMeals(p.defaultMeals);
    if (p.password) m.passwordHash = await adapter.hash(String(p.password));
    if (isNew) notify(db, 'all', `নতুন মেম্বার যোগ হয়েছেন: ${m.name}`, 'member');
    return publicMember(m);
  });

  def('deleteMember', 'manager', (db, p, me) => {
    if (p.id === me.id) throw new AppError('bad_request', 'নিজেকে মুছে ফেলা যাবে না');
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

  def('transferManager', 'manager', (db, p, me) => {
    const m = db.members.find((x) => x.id === p.memberId && x.active);
    if (!m) throw new AppError('not_found');
    db.members.find((x) => x.id === me.id).role = 'member';
    m.role = 'manager';
    notify(db, 'all', `নতুন ম্যানেজার: ${m.name}`, 'member');
    return { ok: true };
  });

  def('listDeposits', 'manager', (db, p) => {
    const month = p.month || monthOf(todayStr());
    return db.deposits
      .filter((x) => monthOf(x.date) === month)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((x) => ({ ...x, name: db.members.find((m) => m.id === x.memberId)?.name || '' }));
  });
  def('saveDeposit', 'manager', (db, p, me) => {
    validDate(p.date);
    const amount = num(p.amount);
    req(amount !== 0, 'টাকার পরিমাণ দিন');
    req(db.members.some((m) => m.id === p.memberId), 'মেম্বার নির্বাচন করুন');
    const type = p.type === 'service' ? 'service' : 'meal';
    if (p.id) {
      const e = db.deposits.find((x) => x.id === p.id);
      if (!e) throw new AppError('not_found');
      Object.assign(e, { date: p.date, memberId: p.memberId, amount, type, note: String(p.note || '') });
      return e;
    }
    const d = { id: uid(), date: p.date, memberId: p.memberId, amount, type, note: String(p.note || ''), by: me.id, createdAt: new Date().toISOString() };
    db.deposits.push(d);
    notify(db, p.memberId, `আপনার ${type === 'service' ? 'সার্ভিস চার্জ' : 'মিল'} জমা ${amount} টাকা গ্রহণ করা হয়েছে (${p.date})`, 'deposit');
    return d;
  });
  def('deleteDeposit', 'manager', (db, p) => {
    db.deposits = db.deposits.filter((x) => x.id !== p.id);
    return { ok: true };
  });

  def('listBills', 'member', (db, p) => {
    const month = p.month || monthOf(todayStr());
    return db.bills.filter((x) => x.month === month);
  });
  def('saveBill', 'manager', (db, p, me) => {
    req(/^\d{4}-\d{2}$/.test(p.month), 'মাস দিন');
    req(BILL_TYPES.includes(p.type), 'ধরন নির্বাচন করুন');
    const amount = num(p.amount);
    req(amount > 0, 'টাকার পরিমাণ দিন');
    const data = { month: p.month, type: p.type, amount, note: String(p.note || ''), memberIds: Array.isArray(p.memberIds) ? p.memberIds : [] };
    if (p.id) {
      const e = db.bills.find((x) => x.id === p.id);
      if (!e) throw new AppError('not_found');
      Object.assign(e, data);
      return e;
    }
    const b = { id: uid(), ...data, by: me.id, createdAt: new Date().toISOString() };
    db.bills.push(b);
    notify(db, 'all', `সার্ভিস চার্জ যোগ হয়েছে (${p.month})`, 'bill');
    return b;
  });
  def('deleteBill', 'manager', (db, p) => {
    db.bills = db.bills.filter((x) => x.id !== p.id);
    return { ok: true };
  });

  def('saveDuty', 'manager', (db, p) => {
    validDate(p.date);
    req(db.members.some((m) => m.id === p.memberId), 'মেম্বার নির্বাচন করুন');
    db.duties = db.duties.filter((x) => x.date !== p.date);
    const d = { id: uid(), date: p.date, memberId: p.memberId, note: String(p.note || '') };
    db.duties.push(d);
    notify(db, p.memberId, `${p.date} তারিখে আপনার বাজার ডিউটি`, 'duty');
    return d;
  });
  def('deleteDuty', 'manager', (db, p) => {
    db.duties = db.duties.filter((x) => x.id !== p.id);
    return { ok: true };
  });
  def('autoDuties', 'manager', (db, p) => {
    req(/^\d{4}-\d{2}$/.test(p.month), 'মাস দিন');
    const active = db.members.filter((m) => m.active);
    req(active.length, 'কোনো সক্রিয় মেম্বার নেই');
    const every = Math.max(1, Number(p.everyDays) || 2);
    const days = daysInMonth(p.month);
    db.duties = db.duties.filter((x) => monthOf(x.date) !== p.month);
    let i = 0;
    for (let d = 1; d <= days; d += every) {
      db.duties.push({ id: uid(), date: `${p.month}-${pad(d)}`, memberId: active[i % active.length].id, note: '' });
      i++;
    }
    notify(db, 'all', `${p.month} মাসের বাজার ডিউটি তালিকা তৈরি হয়েছে`, 'duty');
    return { created: i };
  });
  def('sendDutyReminder', 'manager', async (db, p) => {
    const d = db.duties.find((x) => x.id === p.id);
    if (!d) throw new AppError('not_found');
    const m = db.members.find((x) => x.id === d.memberId);
    const msg = fill(db.settings.dutySmsTemplate, { name: m.name, date: d.date, mess: db.settings.messName });
    notify(db, m.id, `রিমাইন্ডার: ${d.date} তারিখে আপনার বাজার ডিউটি`, 'duty');
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
    notify(db, 'all', `${p.date} তারিখের মেনু আপডেট হয়েছে`, 'menu');
    return e;
  });
  def('deleteMenu', 'manager', (db, p) => {
    db.menus = db.menus.filter((x) => x.id !== p.id);
    return { ok: true };
  });

  function menuText(db, menu) {
    const lines = [];
    if (menu.breakfast) lines.push(`সকাল: ${menu.breakfast}`);
    if (menu.lunch) lines.push(`দুপুর: ${menu.lunch}`);
    if (menu.dinner) lines.push(`রাত: ${menu.dinner}`);
    if (menu.note) lines.push(`নোট: ${menu.note}`);
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
  def('menuSmsPreview', 'manager', (db, p) => {
    const menu = db.menus.find((x) => x.date === p.date);
    if (!menu) throw new AppError('not_found', 'এই তারিখের মেনু নেই');
    const c = mealCountsFor(db, p.date);
    const message = fill(db.settings.menuSmsTemplate, {
      cook: db.settings.cookName || 'বাবুর্চি',
      date: p.date,
      menu: menuText(db, menu),
      meals: `সকাল ${c.b}, দুপুর ${c.l}, রাত ${c.d}`,
      mess: db.settings.messName,
    });
    return { number: db.settings.cookPhone, message };
  });
  def('sendMenuToCook', 'manager', async (db, p) => {
    const menu = db.menus.find((x) => x.date === p.date);
    if (!menu) throw new AppError('not_found', 'এই তারিখের মেনু নেই');
    req(db.settings.cookPhone, 'সেটিংসে বাবুর্চির মোবাইল নম্বর দিন');
    const c = mealCountsFor(db, p.date);
    const message =
      p.message ||
      fill(db.settings.menuSmsTemplate, {
        cook: db.settings.cookName || 'বাবুর্চি',
        date: p.date,
        menu: menuText(db, menu),
        meals: `সকাল ${c.b}, দুপুর ${c.l}, রাত ${c.d}`,
        mess: db.settings.messName,
      });
    const r = await sms(db, 'cook', db.settings.cookPhone, message, 'menu');
    menu.sentAt = new Date().toISOString();
    menu.sentOk = r.ok;
    return r;
  });

  def('dueList', 'manager', (db, p) => {
    const month = p.month || monthOf(todayStr());
    const c = computeMonth(db, month);
    return c.rows
      .filter((r) => r.due > 0)
      .map((r) => ({
        ...r,
        message: fill(db.settings.dueSmsTemplate, { name: r.name, mess: db.settings.messName, month, due: Math.ceil(r.due), meal: Math.ceil(Math.max(0, -r.mealBalance)), service: Math.ceil(Math.max(0, -r.serviceBalance)) }),
      }));
  });
  def('sendDueSms', 'manager', async (db, p) => {
    const month = p.month || monthOf(todayStr());
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
      notify(db, id, `ডিউ অ্যালার্ট: ${month} মাসে আপনার বকেয়া ${Math.ceil(r.due)} টাকা`, 'due');
      results.push({ memberId: id, name: r.name, ...(await sms(db, id, r.phone, message, 'due')) });
    }
    return results;
  });
  def('sendCustomSms', 'manager', async (db, p) => {
    const msg = String(p.message || '').trim();
    req(msg, 'মেসেজ লিখুন');
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
    req(msg, 'মেসেজ লিখুন');
    notify(db, 'all', msg, 'notice');
    return { ok: true };
  });

  def('getSettings', 'manager', (db) => db.settings);
  def('saveSettings', 'manager', (db, p) => {
    const s = db.settings;
    const keys = ['messName', 'address', 'currency', 'cookName', 'cookPhone', 'dueSmsTemplate', 'menuSmsTemplate', 'dutySmsTemplate', 'membersCanEditMeals', 'membersCanAddBazar', 'mealLockHour'];
    keys.forEach((k) => {
      if (p[k] !== undefined) s[k] = p[k];
    });
    if (p.weights) s.weights = { b: num(p.weights.b), l: num(p.weights.l), d: num(p.weights.d) };
    return s;
  });

  def('exportData', 'manager', (db) => {
    const copy = JSON.parse(JSON.stringify(db));
    return copy;
  });
  def('importData', 'manager', (db, p) => {
    req(p.data && Array.isArray(p.data.members) && p.data.members.length, 'ভুল ব্যাকআপ ফাইল');
    const base = emptyDb();
    for (const k of Object.keys(base)) db[k] = p.data[k] ?? base[k];
    db.settings = { ...base.settings, ...(p.data.settings || {}) };
    return { ok: true };
  });

  const READ_ONLY = new Set([
    'publicSummary', 'me', 'directory', 'memberDetail', 'notifications', 'mealsForDate', 'listBazar', 'listDuties', 'listMenus',
    'overview', 'listMembers', 'listDeposits', 'listBills', 'menuSmsPreview', 'dueList', 'smsLog', 'getSettings', 'exportData',
  ]);

  async function call(action, payload = {}, token = null) {
    const a = A[action];
    if (!a) throw new AppError('unknown_action', 'Unknown action: ' + action);
    return serial(async () => {
      const db = await store.load();
      let me = null;
      if (a.role !== 'public') {
        const t = token ? await adapter.verifyToken(token) : null;
        me = t ? db.members.find((m) => m.id === t.uid) : null;
        if (!me || !me.active) throw new AppError('unauthorized', 'আবার লগইন করুন');
        if (a.role === 'manager' && me.role !== 'manager') throw new AppError('forbidden', 'শুধু ম্যানেজার এটি করতে পারবেন');
      }
      const result = await a.fn(db, payload || {}, me);
      if (!READ_ONLY.has(action)) await store.save(db);
      return JSON.parse(JSON.stringify(result ?? null));
    });
  }

  return { call, actions: Object.keys(A) };
}
