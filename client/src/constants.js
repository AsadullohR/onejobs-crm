// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STAGES = [
  {key:"Yangi",                         label:"Yangi",                          c:"#6366f1"},
  {key:"Qilindi",                       label:"Qilindi",                        c:"#8b5cf6"},
  {key:"Boglanildi",                     label:"Boglanildi",                      c:"#f59e0b"},
  {key:"Onlayn Suhbat Uchun",           label:"Onlayn Suhbat Uchun",           c:"#06b6d4"},
  {key:"Onlayn Suhbat",                 label:"Onlayn Suhbat",                 c:"#0ea5e9"},
  {key:"Suhbat",                        label:"Suhbat",                         c:"#10b981"},
  {key:"Shartnoma qildi",               label:"Shartnoma qildi",               c:"#22c55e"},
  {key:"XBA To'lov qildi",              label:"XBA To'lov qildi",              c:"#f97316"},
  {key:"CV Topshirildi",                label:"CV Topshirildi",                 c:"#a855f7"},
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
  {key:"Bekor qildi",                   label:"Bekor qildi",                   c:"#6b7280"},
  {key:"Keyinchalik",                   label:"Keyinchalik",                   c:"#0369a1"},
  {key:"Anchagacha Ko'tarmadi",         label:"Anchagacha Ko'tarmadi",         c:"#9ca3af"},
];
const gS = k => STAGES.find(s=>s.key===k)||{c:"#6b7280",label:k||"–"};
const DONE = ["Jo'nab ketdi","Viza Oldi"];
const LOST = ["Viza Rad Etildi","Bekor qildi","Anchagacha Ko'tarmadi"];

const INIT_CFG = {
  countries:["Albaniya", "Aniq emas", "Arab", "Bolgariya", "Daniya", "Fransiya", "Germaniya", "Koreya", "Litva", "Montenegro", "Polsha", "Rossiya", "Serbiya", "Slovakiya", "Sloveniya", "Turkiya"],
  sectors:["BCE Haydovchi","Qurilish","Mehmonxona","Zavod","Til kursi","Qishloq Xo'jaligi","Svarshik","Work and travel","Tikuvchilik","Sklad","Elektrik","Oshpaz","Animatsiya"],
  sources:["Bot orqali", "Instagram", "Muslimbek", "Olim aka", "Onlayn Ariza", "Oybek +998 95 533 00 70", "Sarafan", "Taqdimot", "Target", "Telefon", "Telegram", "Yarmarka"],
  positions:["Oshpaz","Yordamchi oshpaz","Ofitsiant","Animatsiya","Barman","Resepshn","Svarshik","Haydovchi","Qurilishchi","Bog'bon"],
  txnInc:["XBA To'lov","1-Qism","2-Qism","3-Qism","Bonus","Ro'yxat","Boshqa"],
  txnExp:["Maosh","Avans","Bonus","Reklama","Ofis ijara","Transport","KPI","Boshqa"],
};

const INIT_ROLES = {
  admin:   {label:"Admin",      color:"#6366f1",canOwner:true, canFin:true, canEdit:true, canCfg:true, canTeam:true,  seeAll:true, canTakeUnassigned:true, canChangeOwner:true},
  manager: {label:"Menejer",    color:"#22c55e",canOwner:true, canFin:true, canEdit:true, canCfg:true, canTeam:false, seeAll:true, canTakeUnassigned:true, canChangeOwner:true},
  sales:   {label:"Sotuv/Call", color:"#f97316",canOwner:false,canFin:false,canEdit:true, canCfg:false,canTeam:false, seeAll:true, canTakeUnassigned:true, canChangeOwner:false},
  docs:    {label:"Konsultant", color:"#06b6d4",canOwner:true, canFin:false,canEdit:true, canCfg:false,canTeam:false, seeAll:true, canTakeUnassigned:true, canChangeOwner:false},
  partner: {label:"Hamkor",     color:"#6b7280",canOwner:false,canFin:false,canEdit:true, canCfg:false,canTeam:false, seeAll:false,canTakeUnassigned:false,canChangeOwner:false},
  employer:{label:"Ish Beruvchi",color:"#0891b2",canOwner:false,canFin:false,canEdit:false,canCfg:false,canTeam:false, seeAll:false,canTakeUnassigned:false,canChangeOwner:false},
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

export {
STAGES, DONE, LOST, gS,
INIT_LEADS, INIT_TASKS, INIT_TXN,
INIT_CFG, INIT_TEAM, INIT_ROLES, INIT_VISA,
RAW_LEADS, FIN_MAP
};