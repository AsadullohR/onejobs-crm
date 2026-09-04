// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STAGES = [
  {key:"Yangi",                         label:"Yangi",                          c:"#6366f1"},
  {key:"Qilindi",                       label:"Qilindi",                        c:"#8b5cf6"},
  {key:"Boglanildi",                    label:"Boglanildi",                     c:"#f59e0b"},
  {key:"Onlayn Suhbat Uchun",           label:"Onlayn Suhbat Uchun",           c:"#06b6d4"},
  {key:"Onlayn Suhbat",                 label:"Onlayn Suhbat",                 c:"#0ea5e9"},
  {key:"Suhbat",                        label:"Suhbat",                        c:"#10b981"},
  {key:"Shartnoma qildi",               label:"Shartnoma qildi",               c:"#22c55e"},
  {key:"Hujjat",                        label:"Hujjat",                        c:"#84cc16"},
  {key:"XBA To'lov qildi",              label:"XBA To'lov qildi",              c:"#f97316"},
  {key:"CV Topshirildi",                label:"CV Topshirildi",                c:"#a855f7"},
  {key:"Interview ga qo'yildi",         label:"Interview ga qo'yildi",         c:"#eab308"},
  {key:"Ishga qabul qilindi",           label:"Ishga qabul qilindi",           c:"#16a34a"},
  {key:"1 - Qism To'landi",             label:"1 - Qism To'landi",             c:"#ec4899"},
  {key:"Hujjatlar Tayyorlanmoqda",      label:"Hujjatlar Tayyorlanmoqda",      c:"#3b82f6"},
  {key:"Hujjatlar Jonatilishga Tayyor", label:"Hujjatlar Jonatilishga Tayyor", c:"#2563eb"},
  {key:"Hujjatlar Jonatildi",           label:"Hujjatlar Jonatildi",           c:"#1d4ed8"},
  {key:"Ish shartnomasi keldi",         label:"Ish shartnomasi keldi",         c:"#0d9488"},
  {key:"Ish shartnomasi imzolandi",     label:"Ish shartnomasi imzolandi",     c:"#059669"},
  {key:"Taklifnoma keldi",              label:"Taklifnoma keldi",              c:"#0891b2"},
  {key:"Elchixonaga Hujjatlar Tayyor",  label:"Elchixonaga Hujjatlar Tayyor", c:"#d97706"},
  {key:"Vizaga Topshirildi",            label:"Vizaga Topshirildi",            c:"#7c3aed"},
  {key:"Viza Oldi",                     label:"Viza Oldi ✅",                  c:"#15803d"},
  {key:"Jo'nab ketdi",                  label:"Jo'nab ketdi ✈️",              c:"#166534"},
  {key:"Viza Rad Etildi",               label:"Viza Rad ❌",                  c:"#dc2626"},
  {key:"Rad etildi",                    label:"Rad etildi",                    c:"#ef4444"},
  {key:"Bekor qildi",                   label:"Bekor qildi",                   c:"#6b7280"},
  {key:"Keyinchalik",                   label:"Keyinchalik",                   c:"#0369a1"},
  {key:"Anchagacha ko'tarmadi",         label:"Anchagacha ko'tarmadi",         c:"#9ca3af"},
];
const gS = k => STAGES.find(s=>s.key===k)||{c:"#6b7280",label:k||"–"};
const DONE = ["Jo'nab ketdi","Viza Oldi"];
const LOST = ["Viza Rad Etildi","Rad etildi","Bekor qildi","Anchagacha ko'tarmadi"];

const INIT_CFG = {
  countries:["Albaniya","Angilya","Aniq emas","Arab","Belaruss","Bolgariya","Chexiya","Daniya","Fransiya","Germaniya","Italy","Koreya","Latviya","Litva","Maldiv","Montenegro","Polsha","Rossiya","Serbiya","Slovakiya","Sloveniya","Turkiya","Xorvatiya"],
  sectors:["Animatsiya","Ausbildung","BC Haydovchi","BCE Haydovchi","BCED Haydovchi","Boyoqchi","Ekskavator","Elektrik","Kafelchi","Kassa","Kladchik","Kran","Kuryer","Mebel","Mehmonxona","Mehmonxona Xizmati","O'simlik parvarishlash","Oshpaz","Otdelka","Parnik","Pitsa","Povar","Qishloq Xo'jaligi","Qossobchilik","Qurilish","Santexnik","Shifokor","Sklad","Sushi master","Svarshik","Tikuvchilik","Til kursi","Traktor","Transformator","Turist","Uy Xizmati","Work and travel","Xizmat Korsatish","Zavod"],
  sources:["Bot orqali","Instagram","Muslimbek","Olim aka","Onlayn Ariza","Oybek +998 95 533 00 70","Sarafan","Sarvar aka hamkor-+998 94 838 72 50","Taqdimot","Target","Telefon","Telegram","Yarmarka"],
  positions:["Oshpaz","Yordamchi oshpaz","Ofitsiant","Animatsiya","Barman","Resepshn","Svarshik","Haydovchi","Qurilishchi","Bog'bon"],
  txnInc:["XBA To'lov","1-Qism","2-Qism","3-Qism","Bonus","Ro'yxat","Boshqa"],
  txnExp:["Maosh","Avans","Bonus","Reklama","Ofis ijara","Transport","KPI","Boshqa"],
};

const INIT_ROLES = {
  admin:   {label:"Admin",      color:"#6366f1",canOwner:true, canFin:true, canSalary:true, canEdit:true, canCfg:true, canTeam:true,  seeAll:true, canTakeUnassigned:true, canChangeOwner:true},
  manager: {label:"Menejer",    color:"#22c55e",canOwner:true, canFin:true, canSalary:false,canEdit:true, canCfg:true, canTeam:false, seeAll:true, canTakeUnassigned:true, canChangeOwner:true},
  sales:   {label:"Sotuv/Call", color:"#f97316",canOwner:true, canFin:false,canSalary:false,canEdit:false,canCfg:false,canTeam:false, seeAll:true, canTakeUnassigned:true, canChangeOwner:true, canEditVacancy:false},
  docs:    {label:"Konsultant", color:"#06b6d4",canOwner:true, canFin:false,canSalary:false,canEdit:false,canCfg:false,canTeam:false, seeAll:true, canTakeUnassigned:true, canChangeOwner:false,canEditVacancy:false},
  hujjatchi:{label:"Hujjatchi", color:"#8b5cf6",canOwner:true, canFin:false,canSalary:false,canEdit:false,canCfg:false,canTeam:false, seeAll:true, canTakeUnassigned:true, canChangeOwner:false,canEditVacancy:false},
  partner: {label:"Hamkor",     color:"#6b7280",canOwner:false,canFin:false,canSalary:false,canEdit:false,canCfg:false,canTeam:false, seeAll:false,canTakeUnassigned:false,canChangeOwner:false,canEditVacancy:false},
  employer:{label:"Ish Beruvchi",color:"#0891b2",canOwner:false,canFin:false,canSalary:false,canEdit:false,canCfg:false,canTeam:false, seeAll:false,canTakeUnassigned:false,canChangeOwner:false,canEditVacancy:true},
  finance_manager:{label:"Moliya Menejer",color:"#10b981",canOwner:false,canFin:true,canSalary:true,canEdit:false,canCfg:false,canTeam:false,seeAll:true,canTakeUnassigned:false,canChangeOwner:false},
};

const INIT_TEAM = [
  {id:1, name:"Admin",   username:"admin",   role:"admin",   password:"admin123",   av:"AA",color:"#6366f1",phone:"+998901234567",active:true, salary:5000000, salType:"fixed",  pct:0,  salItems:[{id:1,label:"Oylik maosh",amount:5000000}]},
  {id:2, name:"Xusanxon",      username:"xusanxon",role:"manager", password:"manager123", av:"XS",color:"#22c55e",phone:"+998901234568",active:true, salary:4000000, salType:"fixed",  pct:0,  salItems:[{id:1,label:"Oylik maosh",amount:4000000},{id:2,label:"KPI bonus",amount:500000}]},
  {id:3, name:"Sarvarbek",     username:"sarvar",  role:"sales",   password:"sales123",   av:"SB",color:"#f97316",phone:"+998901234569",active:true, salary:0,       salType:"percent",pct:5,  salItems:[]},
  {id:4, name:"Muhammad Rizo", username:"rizo",    role:"sales",   password:"sales456",   av:"MR",color:"#eab308",phone:"+998901234570",active:true, salary:0,       salType:"percent",pct:5,  salItems:[]},
  {id:5, name:"Asadulloh",     username:"asad",    role:"docs",    password:"docs123",    av:"AS",color:"#06b6d4",phone:"+998901234571",active:true, salary:2500000, salType:"fixed",  pct:0,  salItems:[{id:1,label:"Oylik maosh",amount:2500000}]},
  {id:7, name:"Hamkor Europe", username:"partner", role:"partner", password:"partner123", av:"HP",color:"#6b7280",phone:"+998901234573",active:true, salary:0,       salType:"fixed",  pct:0,  salItems:[]},
  {id:8, name:"ABC Company",  username:"employer1",role:"employer",password:"emp123",    av:"AC",color:"#0891b2",phone:"",             active:true, salary:0,       salType:"fixed",  pct:0,  salItems:[]},
];

// ─── REAL LEADS (500 top leads from OneJobs DB) ──────────────────────────────
// Compact format: [id, name, phone, status, country, sector, source, gender, owner, comment, note, q1, q2, q3, xba, inc, exp, bal, lastContact, dest, telegram]
const RAW_LEADS = [];


const INIT_LEADS = RAW_LEADS.map(r => ({
  id:r[0], name:r[1], phone:r[2], status:r[3]||"Yangi", country:r[4], sector:r[5],
  source:r[6], gender:r[7], owner:r[8], comment:r[9], note:r[10],
  q1:!!r[11], q2:!!r[12], q3:!!r[13], xba:!!r[14],
  totalIncome:r[15]||0, totalExpense:r[16]||0, netBalance:r[17]||0,
  lastContact:r[18], dest:r[19], telegram:r[20]||"",
  ownerSales:null, ownerConsult:null, ownerDocs:null,
  kpiSales:false, kpiConsult:false, kpiDocs:false,
  q1R:null, q2R:null, q3R:null, xbaR:null,
  sofFoyda:null, docs:{}, cv:{}, history:[],
  createdAt:"2026-01-01", position:"",
}));


// ─── FINANCE MAP from CSV import ─────────────────────────────────────────────
// [leadId, totalIncome, totalExpense] from OneJobs_Mijozlar_2026-05-13.csv
const FIN_MAP = [];

const INIT_TXN = [
  {id:1,leadId:"NO-3709",date:"2026-04-28",type:"income", cat:"Ro'yxat",  desc:"Registratsiya", amount:618000, by:5},
  {id:2,leadId:"NO-3709",date:"2026-04-28",type:"expense",cat:"KPI",      desc:"KPI",            amount:50000,  by:1},
  {id:3,leadId:"NO-3247",date:"2026-04-15",type:"income", cat:"XBA To'lov",desc:"XBA",           amount:468000, by:3},
  {id:4,leadId:"NO-3395",date:"2026-03-10",type:"income", cat:"3-Qism",   desc:"To'liq",        amount:1800000,by:3},
  {id:5,leadId:"NO-3714",date:"2026-04-01",type:"income", cat:"2-Qism",   desc:"2-qism",        amount:1700000,by:2},
  {id:6,leadId:null,     date:"2026-05-01",type:"expense",cat:"Maosh",    desc:"May maoshi",    amount:8000000,by:1},
  {id:7,leadId:null,     date:"2026-04-01",type:"expense",cat:"Reklama",  desc:"Target",        amount:2500000,by:1},
];

const INIT_TASKS = [
  {id:1,title:"Hujjatlarni tekshir",desc:"CV tayyorlash",assignee:5,leadId:"NO-3709",priority:"high",  status:"todo",      due:"2026-05-08",createdBy:1,at:"2026-05-01"},
  {id:2,title:"Interview uyushtir", desc:"",            assignee:2,leadId:"NO-690", priority:"medium",status:"inprogress",due:"2026-05-06",createdBy:2,at:"2026-05-02"},
];

const INIT_VISA = [
  {id:1,country:"Bolgariya",flag:"🇧🇬",type:"D viza",duration:"30-60 kun",docs:["Zagranpassport","Rasm 3.5x4.5","Mehnat shartnomasi","Sug'urta","Bank ko'chirma"],notes:"EU a'zosi. Shengen emas."},
  {id:2,country:"Germaniya",flag:"🇩🇪",type:"D viza (Natsional)",duration:"60-90 kun",docs:["Zagranpassport","Visum-Antrag","Rasm 35x45","Mehnat shartnomasi","A1 sertifikat"],notes:"Til kursi majburiy."},
  {id:3,country:"Turkiya",  flag:"🇹🇷",type:"Ish visa",duration:"15-30 kun",docs:["Zagranpassport","Çalışma İzni","Mehnat shartnomasi","Sug'urta"],notes:"Vizasiz 30 kun."},
];

// ─── PAYROLL CLASSIFICATION ───────────────────────────────────────────────────
// ONE definition of "is this expense company payroll?", shared by the Salary
// page and the finance dashboard so the two screens can never disagree.
// Rules: never tied to a client lead (that excludes client-side costs), and
// either explicitly attached to an employee or carrying a real salary reason.
// "Boshqa" is a catch-all, so an unattached "Boshqa" expense (rent, marketing)
// is NOT payroll until someone assigns it to an employee.
const SALARY_CATS = ["Oylik maosh", "Maosh", "Avans", "Bonus", "KPI", "Jarima", "Boshqa"];
const SALARY_CATS_STRICT = SALARY_CATS.filter(c => c !== "Boshqa");
// An expense paid out of realised profit (Tasdiqlangan) rather than general
// funds. Works for both ledgers — transactions and external rows both carry
// type + source. Default 'balance' means it only affects Balans.
const isConfirmedSpend = (r) => r.type === "expense" && r.source === "confirmed";

const isPayrollTxn = (t) =>
  t.type === "expense" && !t.leadId &&
  ((t.empId || t.empName) ? SALARY_CATS.includes(t.cat) : SALARY_CATS_STRICT.includes(t.cat));

// ─── BACKWARD MOVE DETECTION ─────────────────────────────────────────────────
// Candidate and lead statuses are linked, so one careless edit can drag someone
// from "Hujjatlar Jonatildi" back to "Ishga qabul qilindi". A plain index
// comparison over STAGES would be wrong: the rejection stages sit at the end of
// the array, so "Hujjat -> Rad etildi" would read as forward progress and
// "Rad etildi -> Hujjat" (a revival) as backward. Only the positive ladder is
// ordered; rejections and parks are outside it and never warn.
const PARKED_STAGES = ["Keyinchalik"];
const PROGRESS_STAGES = STAGES.map(s => s.key)
  .filter(k => !LOST.includes(k) && !PARKED_STAGES.includes(k));
const progressIndex = (s) => PROGRESS_STAGES.indexOf(s);

const isBackwardMove = (from, to) => {
  const a = progressIndex(from), b = progressIndex(to);
  return a >= 0 && b >= 0 && b < a;
};
// How many stages the move gives up — used to make the warning concrete.
const stagesLost = (from, to) =>
  isBackwardMove(from, to) ? progressIndex(from) - progressIndex(to) : 0;

// --- CANDIDATE DOCUMENT TRACKS ---------------------------------------------
// Each track is one document moving through the same physical journey.
// Stored on the candidate as { trackKey: { stepKey: "YYYY-MM-DD" } } -- a
// date rather than a boolean, because "when did the diploma reach them" is
// the question people actually ask. Steps are data, so adding one later
// never needs a migration and never breaks a candidate mid-process.
const DOC_TRACKS = [
  {
    key: "shartnoma", label: "Ish shartnomasi", icon: "📄",
    steps: [
      { key: "keldi", label: "Keldi" },
      { key: "imzolandi", label: "Imzolandi" },
      { key: "skaner", label: "Skaner tashlandi" },
      { key: "jonatildi", label: "Jo'natildi" },
      { key: "yetib_bordi", label: "Yetib bordi" },
    ],
  },
  {
    key: "diplom", label: "Diplom", icon: "🎓",
    steps: [
      { key: "qabul", label: "Qabul qilindi" },
      { key: "apostilga", label: "Tarjima/apostilga topshirildi" },
      { key: "apostil_tayyor", label: "Apostil tayyor" },
      { key: "jonatildi", label: "Jo'natildi" },
      { key: "yetib_bordi", label: "Yetib bordi" },
    ],
  },
  {
    key: "prava", label: "Prava", icon: "🚗",
    steps: [
      { key: "qabul", label: "Qabul qilindi" },
      { key: "apostilga", label: "Tarjima/apostilga topshirildi" },
      { key: "apostil_tayyor", label: "Apostil tayyor" },
      { key: "jonatildi", label: "Jo'natildi" },
      { key: "yetib_bordi", label: "Yetib bordi" },
    ],
  },
  {
    key: "sudlanmaganlik", label: "Sudlanmaganlik", icon: "🛡",
    steps: [
      { key: "qabul", label: "Qabul qilindi" },
      { key: "apostilga", label: "Tarjima/apostilga topshirildi" },
      { key: "apostil_tayyor", label: "Apostil tayyor" },
      { key: "jonatildi", label: "Jo'natildi" },
      { key: "yetib_bordi", label: "Yetib bordi" },
    ],
  },
  {
    key: "zagran", label: "Zagran", icon: "🛂",
    steps: [
      { key: "olindi", label: "Olindi" },
      { key: "jonatildi", label: "Jo'natildi" },
    ],
  },
];

// How many steps of a track are done, and whether it is finished.
const trackProgress = (checklist, track) => {
  const t = (checklist || {})[track.key] || {};
  const done = track.steps.filter(st => t[st.key]).length;
  return { done, total: track.steps.length, complete: done === track.steps.length };
};

// Income booked straight into realised profit instead of only lifting Balans.
// Mirrors isConfirmedSpend. Works for both ledgers (transactions + external).
const isConfirmedIncome = (r) => r.type === "income" && r.source === "confirmed";

// ─── TASDIQLANGAN / SOF FOYDA ────────────────────────────────────────────────
// Single source of truth for realised profit. Finance, FinanceHub and the
// dashboard all call this — they drifted apart three separate times when each
// screen computed its own version.
//
// Tasdiqlangan is made of exactly three things, and NOTHING is implicit:
//   1. Leads whose profit was explicitly confirmed (profitConfirmed flag).
//      Reaching "Viza Oldi"/"Jo'nab ketdi" is NOT enough — a human clicks
//      Tugagan. Imported leads arrive with sof_foyda pre-filled, so keying off
//      status alone silently pulled them in.
//   2. Income rows explicitly booked to Tasdiqlangan (source === 'confirmed'),
//      whether attached to a client or not.
//   3. Minus expenses paid out of Tasdiqlangan.
//
// (1) and (2) are additive and cannot double-count: sof_foyda is a snapshot
// locked at confirm time, and confirmSnapshotProfit() below excludes income
// that was already booked to Tasdiqlangan before the snapshot was taken.
const confirmedLeadProfit = (leads = []) =>
  leads.filter(l => l.profitConfirmed).reduce((s, l) => s + Number(l.sofFoyda || 0), 0);

const confirmedIncome = (...ledgers) =>
  ledgers.flat().filter(isConfirmedIncome).reduce((s, r) => s + Number(r.amount || 0), 0);

const confirmedSpend = (...ledgers) =>
  ledgers.flat().filter(isConfirmedSpend).reduce((s, r) => s + Number(r.amount || 0), 0);

// Tasdiqlangan (gross realised profit): confirmed leads + confirmed income.
// Adding income to an already-confirmed client raises it — 400 confirmed plus
// a new 500 booked to Tasdiqlangan reads 900.
const calcTasdiqlangan = (leads = [], txns = [], extExps = []) =>
  confirmedLeadProfit(leads) + confirmedIncome(txns, extExps);

// Sof Foyda (net): Tasdiqlangan minus whatever was spent out of that pot.
const calcSofFoyda = (leads = [], txns = [], extExps = []) =>
  calcTasdiqlangan(leads, txns, extExps) - confirmedSpend(txns, extExps);

// Profit to lock in when Tugagan is clicked. Income already booked directly to
// Tasdiqlangan is excluded — it is counted on its own, so including it in the
// snapshot too would count it twice.
const confirmSnapshotProfit = (leadTxns = []) => {
  const inc = leadTxns
    .filter(t => t.type === "income" && !isConfirmedIncome(t))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const exp = leadTxns
    .filter(t => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  return inc - exp;
};

export {
STAGES, DONE, LOST, gS,
INIT_LEADS, INIT_TASKS, INIT_TXN,
INIT_CFG, INIT_TEAM, INIT_ROLES, INIT_VISA,
RAW_LEADS, FIN_MAP,
SALARY_CATS, isPayrollTxn, isConfirmedSpend, isConfirmedIncome,
confirmedLeadProfit, confirmedIncome, confirmedSpend,
calcTasdiqlangan, calcSofFoyda, confirmSnapshotProfit,
PROGRESS_STAGES, isBackwardMove, stagesLost,
DOC_TRACKS, trackProgress
};