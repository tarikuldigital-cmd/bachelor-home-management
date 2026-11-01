import { emptyDb, todayStr, monthOf, pad } from './engine.js';
import { ARCHIVES } from './archive.js';

// Demo data so the site looks alive on first open.
const PHOTOS = ['mehedi', 'tariqul', 'kawsar', 'robiul', 'ashik', 'anik', 'shakil'];
export async function seedDemo(hash) {
  const db = emptyDb();
  db.settings.messName = 'Bachelor Home';
  db.settings.address = 'Dhaka, Bangladesh';
  db.settings.cookName = 'Cook';
  db.settings.cookPhone = '';
  db.settings.dueSmsTemplate = 'Dear {name}, {mess} {month}. MEAL: {meals} x Tk {rate} = Tk {cost}, deposit Tk {deposit}, meal due Tk {mealDue}. SERVICE CHARGE: Tk {service}, paid Tk {servicePaid}, due Tk {serviceDue}. Please pay soon. Thank you.';
  db.settings.lastAutoDueMonth = 'skip-demo';
  db.settings.menuSmsTemplate = '{cook}, menu for {date}:\n{menu}\nMeals: {meals}\n- {mess}';
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
  // Public: mess-level totals only. Per-member ledger is imported privately by the manager.
  db.archives = JSON.parse(JSON.stringify(ARCHIVES));
  db.members[0].managerSince = `${month}-01`;
  db.notifications.push({ id: 'n1', to: 'all', text: 'Welcome to Bachelor Home Management! 🎉', kind: 'notice', date: new Date().toISOString(), readBy: [] });
  return db;
}
