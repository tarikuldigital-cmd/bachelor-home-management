// Mess-level monthly totals (no per-member data) shown to everyone on the
// home page & dashboard. Per-member accounts are imported privately by the manager.
export const ARCHIVES = {
  '2026-10': {
    note: 'From the mess notebook',
    memberCount: 7,
    totalDeposit: 16500,
    // total meals per day, day 1..31 (sum 274)
    dailyMeals: [0, 7, 11, 10, 12, 10, 10, 11, 9, 9, 14, 10, 5, 0, 11, 13, 11, 10, 7, 6, 6, 6, 8, 8, 10, 10, 10, 12, 6, 11, 11],
    // [day, amount, items] — bazar from the mess fund (sum 15,320)
    bazar: [
      [2, 5260, 'Bazar'],
      [6, 65, 'Bazar'],
      [8, 120, 'Bazar'],
      [9, 1850, 'Bazar (1420 + 430)'],
      [12, 2970, 'Bazar (130 + 2840)'],
      [15, 1040, 'Bazar incl. rice shop Tk 690 paid'],
      [16, 440, 'Grocery shop due Tk 400 paid + 40'],
      [18, 150, 'Bazar'],
      [19, 100, 'Bazar'],
      [21, 310, 'Bazar'],
      [22, 150, 'Bazar'],
      [23, 2370, 'Bazar'],
      [24, 75, 'Bazar'],
      [25, 100, 'Bazar'],
      [29, 160, 'Bazar'],
      [31, 160, 'Bazar (120 + 40)'],
    ],
  },
};
