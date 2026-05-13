import { useState, useMemo, useRef, useCallback, createContext, useContext } from "react";

// ─── THEME ───────────────────────────────────────────────────────────────────
const ThemeCtx = createContext({});
const useT = () => useContext(ThemeCtx);
function mkT(dark) {
  return dark
    ? { dark, bg:"#0a0a0f", card:"#111120", card2:"#161625", border:"#1e1e35",
        text:"#e2e8f0", muted:"#64748b", sub:"#94a3b8",
        accent:"#6366f1", green:"#22c55e", red:"#ef4444", yellow:"#f59e0b",
        blue:"#3b82f6", purple:"#a855f7", cyan:"#06b6d4",
        inp:"#161625", shadow:"0 4px 24px rgba(0,0,0,.5)" }
    : { dark, bg:"#f1f5f9", card:"#ffffff", card2:"#f8fafc", border:"#e2e8f0",
        text:"#1e293b", muted:"#64748b", sub:"#94a3b8",
        accent:"#6366f1", green:"#16a34a", red:"#dc2626", yellow:"#d97706",
        blue:"#2563eb", purple:"#9333ea", cyan:"#0891b2",
        inp:"#ffffff", shadow:"0 4px 24px rgba(0,0,0,.08)" };
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STAGES = [
  {key:"Yangi",                         label:"Yangi",                          c:"#6366f1"},
  {key:"Qilindi",                       label:"Qilindi",                        c:"#8b5cf6"},
  {key:"Bog'landi",                     label:"Bog'landi",                      c:"#f59e0b"},
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
  admin:  {label:"Admin",     color:"#6366f1",canOwner:true, canFin:true,  canEdit:true, canCfg:true, canTeam:true,  seeAll:true, canTakeUnassigned:true},
  manager:{label:"Menejer",   color:"#22c55e",canOwner:true, canFin:false, canEdit:true, canCfg:true, canTeam:false, seeAll:true, canTakeUnassigned:true},
  sales:  {label:"Sotuv/Call",color:"#f97316",canOwner:false,canFin:false, canEdit:true, canCfg:false,canTeam:false, seeAll:true, canTakeUnassigned:true},
  docs:   {label:"Hujjatchi", color:"#06b6d4",canOwner:false,canFin:false, canEdit:false,canCfg:false,canTeam:false, seeAll:true, canTakeUnassigned:false},
  partner:{label:"Hamkor",    color:"#6b7280",canOwner:false,canFin:false, canEdit:false,canCfg:false,canTeam:false, seeAll:false,canTakeUnassigned:false},
};

const INIT_TEAM = [
  {id:1, name:"Admin Akbar",   username:"admin",   role:"admin",   password:"admin123",   av:"AA",color:"#6366f1",phone:"+998901234567",active:true, salary:5000000, salType:"fixed",  pct:0,  salItems:[{id:1,label:"Oylik maosh",amount:5000000}]},
  {id:2, name:"Xusanxon",      username:"xusanxon",role:"manager", password:"manager123", av:"XS",color:"#22c55e",phone:"+998901234568",active:true, salary:4000000, salType:"fixed",  pct:0,  salItems:[{id:1,label:"Oylik maosh",amount:4000000},{id:2,label:"KPI bonus",amount:500000}]},
  {id:3, name:"Sarvarbek",     username:"sarvar",  role:"sales",   password:"sales123",   av:"SB",color:"#f97316",phone:"+998901234569",active:true, salary:0,       salType:"percent",pct:5,  salItems:[]},
  {id:4, name:"Muhammad Rizo", username:"rizo",    role:"sales",   password:"sales456",   av:"MR",color:"#eab308",phone:"+998901234570",active:true, salary:0,       salType:"percent",pct:5,  salItems:[]},
  {id:5, name:"Asadulloh",     username:"asad",    role:"docs",    password:"docs123",    av:"AS",color:"#06b6d4",phone:"+998901234571",active:true, salary:2500000, salType:"fixed",  pct:0,  salItems:[{id:1,label:"Oylik maosh",amount:2500000}]},
  {id:7, name:"Hamkor Europe", username:"partner", role:"partner", password:"partner123", av:"HP",color:"#6b7280",phone:"+998901234573",active:true, salary:0,       salType:"fixed",  pct:0,  salItems:[]},
];

// ─── REAL LEADS (500 top leads from OneJobs DB) ──────────────────────────────
// Compact format: [id, name, phone, status, country, sector, source, gender, owner, comment, note, q1, q2, q3, xba, inc, exp, bal, lastContact, dest, telegram]
const RAW_LEADS = [["NO-184","Nurimon","+998979863363","Vizaga Topshirildi","Germaniya, Turkiya","","Telegram","Erkak","Xusanxon - Konsultant","Germaniya til kursi. 18 kirasiz. B2 eng. Payshamba payshanba tel qilinsin Dadasi bn keldi  kotarmadi","+998907731501",1,0,0,1,618000,150000,468000,"","Antalya",""],["NO-330","Doniyor","+998880022001","Hujjatlar Jonatildi","Serbiya","","Sarafan","","Xusanxon - Konsultant","Dushanba tolov qiladi tolov qildi","",1,0,0,1,200000,50000,150000,"","Serbiya Qurilish",""],["NO-397","Hilola Ismailova","+998 91 485 7804","Hujjatlar Jonatildi","Bolgariya","","Yarmarka","","Asadulloh - Konsultant","Hamshira, Buxgalter, Sotuvchi, Kassir, Masijist Bolalar,  Ho’jayini(Billa rossiya) va Farzandi(Arab)","",0,0,0,0,3500000,1800000,1700000,"","Bolgariya  Kassir",""],["NO-447","Nozimjon Mirkalonov","+998 91 610 6717","XBA To'lov qildi","Bolgariya, Polsha","","Telegram","","Xusanxon - Konsultant","Rus tili, koreys tili.  Mebel sohasida. Svarka elektro. Duradgor.  1-qurilish va boshqa sohalar asos","",0,0,0,1,618000,130000,488000,"","Bolgariya  ",""],["NO-462","Azizbek Artikov","+998906260057","XBA To'lov qildi","Polsha","","Onlayn Ariza","","Asadulloh - Konsultant, Xusanxon - Konsultant","balgarya Kotarmadi tgdan boglandik pulini tolash kk zagram diplom resume kk telefoni ozida emas pols","",0,0,0,0,618000,50000,568000,"","Bolgariya Zavod","Muhammadaziz"],["NO-505","Shoxruxbek","+998996170203","Hujjatlar Jonatildi","Serbiya","","Telegram","","Xusanxon - Konsultant","Rus tlii bladi stroyka usta  video tashlayapdi seshanba keladi, to’lov qildi 1-qism","",1,0,0,1,406000,150000,256000,"","Serbiya Qurilish","@Shoh_rux_bek_96"],["NO-1021","Lutfillayev Xusanxon","+998885835007","Hujjatlar Jonatildi","Germaniya, ITALY","","Sarafan","Erkak","Asadulloh - Konsultant","Italyaga oqishga qiziqyapdi","",0,0,0,0,1800000,1470000,330000,"","Germaniya W/T",""],["NO-1135","Shoyatbek Mahmudov","+998881711007","Hujjatlar Jonatildi","Bolgariya, Turkiya","","Instagram","","Asadulloh - Konsultant, Asrorbek - Sotuv/Hujjat Menejeri","1-kotarmadi 2-kotarmadi 3-shartnoma qilganman dedi","",1,0,0,1,4118000,4250000,-132000,"","Bolgariya Zavod",""],["NO-1347","Tursunov Ilhomjon","946227698","XBA To'lov qildi","Bolgariya, Polsha","","Target","","Asrorbek - Sotuv/Hujjat Menejeri","1-kotarmadi 2-kotarmadi 3-bosh vaqt qilib keladi asakalik 4-keladi Keldi, Rus tili, 52 5-kotarmadi 6","",0,0,0,1,618000,0,618000,"","Bolgariya Zavod",""],["NO-1469","Abdurasul Muhammadjonov","881647887","Vizaga Topshirildi","Turkiya","","Target","","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","seshanba abetlarga keladi 2boshqa joyga borvogan  3-payshanba keladi medianchi comic stuard bad boy ","",1,0,0,1,2118000,130000,1988000,"","Antalya",""],["NO-1630","Ulugbek Qurbonov","+998944954955","Hujjatlar Jonatildi","Bolgariya","","Target","","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","kecha gaplashilgan ekan seshanba  Xusanxondan bitta obed  5 mln tolagan","",1,0,0,1,5618000,6650000,-1032000,"","Bolgariya Fura",""],["NO-1834","Olimjon  Asqarov","887171742","Vizaga Topshirildi","Turkiya","","Target","","Asrorbek - Sotuv/Hujjat Menejeri","1-tg orqali boglaniladi  Toshkentli 2. kotarmadi seshanba 4 5 larga suxbat  3-KO’TARMADI","",0,0,0,1,621000,130000,491000,"","Antalya Sezon",""],["NO-1909","Ismoiljon Kozimjonov","+998973399939","Hujjatlar Jonatildi","Germaniya","","","","Asadulloh - Konsultant","1-Asadulloh aka bn suhbat boldi 21.01 4 dan keyin bolsa vaxti bolarkan","",1,0,0,0,2400000,1620000,780000,"","Germaniya W/T","@ikazimov_i"],["NO-2006","Yoldosheva Xayitxon","905475547","Hujjatlar Jonatildi","Germaniya","","Taqdimot","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","seshanba 11larda keladi ishidan oldin 1-kotarmadi  1, 2 larda keladi  formasi yoq  21.02 kotarmadi","",0,0,0,0,2400000,1800000,600000,"","Germaniya W/T","+"],["NO-2009","Botajonova Jasmina","914998082","Vizaga Topshirildi","Bolgariya","","Taqdimot","","Xusanxon - Konsultant","1-kotarmadi  2-chorshanba  keladi 1 yokoida ikkiga zagram olishi kerak onasi ham balgariyaga qiziqdi","",1,0,0,1,8318000,1850000,6468000,"","Bolgariya Sezon",""],["NO-2012","Muhammedov muhammadqodir","+998886271221","Vizaga Topshirildi","Bolgariya","","Taqdimot","","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","ADU 2-kurs ingliz turk rus. Xusanxon bu bolani tanimadim. 2-shanba tel qsek olamadi 3-dushanba kelad","",1,1,0,1,7618000,1820000,5798000,"","Bolgariya  Sezon",""],["NO-2103","Mamirjonova Afroza","943895818","Hujjatlar Jonatildi","Germaniya","","Taqdimot","","Xusanxon - Konsultant","100$ tolov qildi qolganini payshanba qiladi 21.01 kotarmadi","",0,0,0,0,1200000,1570000,-370000,"","Germaniya W/T","+"],["NO-2104","Zulayho Abdumannopova","888361126","Hujjatlar Jonatildi","Germaniya","","Taqdimot","","Xusanxon - Konsultant","tolov qilgani kelmoqchi qildi  21.02 boshqa kursga boryaptikan","",0,0,0,0,2400000,1650100,749900,"","Germaniya W/T","+"],["NO-2232","Umarjon","+998919477072","Vizaga Topshirildi","Turkiya","","Telefon","","Asrorbek - Sotuv/Hujjat Menejeri, Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","1-pasportlarini olib keladi 2- Keldi, yomon o’rganyapti 3-  941517222 bu nomer ham shu akaniki CRM d","",0,0,0,1,618000,80000,538000,"","Antalya",""],["NO-2300","Malikov Muhammadqodir","+998889980444","Hujjatlar Jonatilishga Tayyor","Germaniya","","Target","Erkak","Asadulloh - Konsultant, Asrorbek - Sotuv/Hujjat Menejeri","1-tgdan yozildi 2-eslatildi 3- Keldi B1, Yakshanba shartnoma va to’lov qilinadi. 4- Gemanyaga topshi","",1,0,0,0,2400000,1162000,1238000,"","Germaniya W/T","ignotus_0414"],["NO-2307","Olimov Muxammadali","+998901247370","Hujjatlar Jonatildi","Germaniya","","","","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","Deuchtland 1-tgdan yozildi 2-iloji boricha tezroq kelishga harakat qiladi  inyazda oqidi 2-kurs","",0,0,0,0,2400000,2735000,-335000,"","Germaniya W/T","@Muxammadali_2002"],["NO-2317","Ulmasov Komiljon Hosiljon ogli","979832005","Hujjatlar Jonatildi","Germaniya","","Sarafan","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","fargona davlat universiteti 3 kurs Ingliz tili  20 yosh","",0,0,0,0,2400000,1800000,600000,"","Germaniya W/T",""],["NO-2340","Topchiyev Sayfiddin","+998958461717","Hujjatlar Jonatildi","Germaniya","","Target","","Asadulloh - Konsultant, Xusanxon - Konsultant","Toshkent To’qimachilik. Uydegilar bilan maslahatlashib tel qiladi. Chorshanba abettan oldin. zagran ","",0,0,0,0,2400000,1470000,930000,"","Germaniya W/T","+"],["NO-2359","Muhammad Sodiq Akbarov","+998888340099","Hujjatlar Jonatildi","Germaniya","","Sarafan","","Asadulloh - Konsultant, Xusanxon - Konsultant","Sherzot aka tanishi","",0,0,0,0,2400000,1750000,650000,"","Germaniya W/T","+"],["NO-2474","Sulaymonov Fazliddin Murodjon ogli","+998947707337","Hujjatlar Jonatildi","Germaniya","","","","Xusanxon - Konsultant","FDTU","",0,0,0,0,2400000,1800000,600000,"","Germaniya W/T","+"],["NO-2491","Marjona","+998 88 089 20 09","XBA To'lov qildi","Bolgariya","","Taqdimot","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","cv tayyorlandi unversitetidan ruxsat beradimi soredi keyn shartnoma qiladi  shartnoma qildi","",0,0,1,1,618000,80000,538000,"","Bolgariya Sezon",""],["NO-2493","Sardorbek Marupov","+79999985258","Shartnoma qildi","Germaniya","","Telegram","","Asadulloh - Konsultant","Grmaniya til kursiga, Mart oyini oxiriga","",0,0,0,0,2420000,2200000,220000,"","Germaniya Til","+79999985258 imo"],["NO-2613","Tursunpolat","994365406","XBA To'lov qildi","Germaniya, Turkiya","","Target","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","ingliz tili reseption 2-zagrani bor KOTARMADI  vaqtinchalik ochrilgan","",0,0,0,1,618000,80000,538000,"","Antalya",""],["NO-3175","Azizbek Ergashev","931463055","XBA To'lov qildi","Turkiya","","Sarafan","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","tolov qildi kelibla  2-ochirilgan 3-ochirilgan 4-kotarmadi 5-kotarmadi  6-bugun keladi gisht teruvch","",0,0,0,1,618000,150000,468000,"","Antalya",""],["NO-3242","Mirkalonov Boburmirzo","+998 91 498 1100","Hujjatlar Jonatildi","Bolgariya, Polsha","","Target","","Asadulloh - Konsultant, Xusanxon - Konsultant","Turkiya qurilishga, Polu avtomat svarshik. 2-BUGUN OTAMAN DEDI PESHINDAN KEYINGA 3-Ertaga tashlab be","",1,0,0,1,4263000,230000,4033000,"","Bolgariya ",""],["NO-3247","Kazakova Shaxribonu","77 271 12 00","XBA To'lov qildi","Turkiya","","Sarafan","Ayol","Xusanxon - Konsultant","klaradan","",0,0,0,1,618000,150000,468000,"","Antalya",""],["NO-3248","Nematov Durbek","+998940221099","Vizaga Topshirildi","Germaniya","","Onlayn Ariza","","Xusanxon - Konsultant","500$","",1,1,0,0,9709000,4545000,5164000,"","Germaniya Til",""],["NO-3249","Surayyo","979870710","Hujjatlar Jonatildi","Germaniya","","Taqdimot","","Xusanxon - Konsultant","200$","",0,0,0,0,2400000,1800000,600000,"","Germaniya W/T",""],["NO-3319","Arslonbek Ahmedov","930452120","Hujjatlar Jonatildi","Bolgariya","","Target","Erkak","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","Perevaldan kelyapti, Payshanba keladi. xusanxon consultatsiya berdi chip kartasi kecha chiqipti qoli","",0,0,0,1,618000,230000,388000,"","Bolgariya Fura",""],["NO-3395","Ilhomjon aka","+998889442400","Hujjatlar Jonatildi","Bolgariya","","Sarafan","Erkak","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","618 dan 4 mln toledi  tolovdi toliq qilib qoyyapti Hayitdan keyin shu oy tolovlarini qilib qoyishadi","",0,0,0,1,2618000,6780000,-4162000,"","Bolgariya Fura",""],["NO-3400","Orinqoziyeva Odinabonu","907601520","Vizaga Topshirildi","Bolgariya","","Muslimbek","Ayol","Xusanxon - Konsultant","rus tili 70% 24 yosh 1-kurs muslim aka odami","",1,1,0,1,7870000,5580000,2290000,"","Bolgariya Sezon",""],["NO-3402","Qodirjonova Xayotxon","916011217","Vizaga Topshirildi","Bolgariya","","Muslimbek","Ayol","Xusanxon - Konsultant","1-kotarmadi","",1,1,0,0,5400000,230000,5170000,"","Bolgariya W/T",""],["NO-3457","Husanboy Mashrabboyev","+998884226611","XBA To'lov qildi","Turkiya","","Target","Erkak","Asadulloh - Konsultant, Xusanxon - Konsultant","1-mono markazga boradi","",0,0,0,1,618000,130000,488000,"","Bolgariya Farmaseft",""],["NO-3476","Munojat Obidova","+998903021604","Vizaga Topshirildi","Turkiya","","Target","Ayol","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","Yanvar ohirigaca tolov qiladi 2-31yanvar tel qilish kere 2-duyshanba xba tolovga pul beradi pul tush","",1,0,0,1,618000,130000,488000,"","Antalya",""],["NO-3654","Xojiakbar Xamidov","+998941514787","Hujjatlar Jonatildi","Germaniya","","Sarafan","","Asadulloh - Konsultant, Xusanxon - Konsultant","Ota onasi to’lab ketti","",0,0,0,0,2400000,1470000,930000,"","Germaniya W/T",""],["NO-3698","Qoyiljon Moydinov","+998995113378","XBA To'lov qildi","Turkiya","","Instagram","","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","1-bugun keladi abetdan keyin sohpatga 2- Keldi shartnoma qildi antalyaga CHORSHANBA KELADI- keldi","Zagranlarini tg’dan tashlashi kerak",0,0,0,1,618000,0,618000,"","Antalya",""],["NO-3709","ABDURAHMONOV XOJIAKBAR","+998 93 258 6282","CV Topshirildi","Bolgariya, Germaniya, Turkiya","","Telegram","","Asadulloh - Konsultant, Xusanxon - Konsultant","Rus tili oz biladi, 31y. berorin dedi","",0,0,0,0,618000,50000,568000,"","Antalya",""],["NO-3818","Mirkomilov Muhammadyusuf","+998 90 773 97 76","Vizaga Topshirildi","Turkiya","","Taqdimot","Erkak","Xusanxon - Konsultant","Antaliya— Germanya (oshpaz yordamchisi) Ausbildung  1-1soatda keladi  Axrana va boshqala chorshanba ","",1,0,0,1,1618000,230000,1388000,"","Antalya",""],["NO-3844","Mamasoliyev Asrorbek","+998 88952 1828","XBA To'lov qildi","Bolgariya","","Taqdimot","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","1-ehsonda ozi qaytaradi  2- kelishga harakat qiladi bugun, keldi 3 oylik Bolgariya ishlariga.","",0,0,0,1,618000,0,618000,"","Antalya",""],["NO-3884","Bobamatov Omadjon","+99850 221 33 73","XBA To'lov qildi","Bolgariya, Turkiya","","Telegram","","Xusanxon - Konsultant","orolli aka chorshanba keladi","",0,0,0,1,618000,130000,488000,"","Antalya",""],["NO-3896","Parpiyev Davlatjon","937818705","XBA To'lov qildi","Bolgariya","","Telegram","","Xusanxon - Konsultant","Ertalabda gaplashib ikki soatda keladi 1 haftada tolov qiladi","",0,0,0,1,618000,0,618000,"","Antalya",""],["NO-4049","Shuxrat Ashurov","994333277","Vizaga Topshirildi","Turkiya","","Sarafan","Erkak","Xusanxon - Konsultant","ohirgi topshirganlardan 18 yosh akasi daniyaga qiziqqan  bugun keladi","",1,1,0,1,7838000,5630000,2208000,"","Bolgariya Sezon",""],["NO-4068","Hayitboyev Avazbek","934469009","XBA To'lov qildi","Bolgariya","","Instagram","","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","Shanba  kuni aloqaga chiqilsin 2-rulda toxtab aloqaga chiqadi 3-kotarmadi","",0,0,0,1,618000,130000,488000,"","Bolgariya Zavod",""],["NO-4082","Nazirov Asilbek","+998 50 002 03 00","XBA To'lov qildi","Bolgariya","","Sarafan","","Xusanxon - Konsultant","1-Xasanboy akani tanishi","",0,0,0,1,618000,130000,488000,"","Bolgariya Oziq-ovqat","+998 50 002 03 00"],["NO-4661","Ortiqov Elyorbek","+998946228595","Hujjatlar Jonatildi","Bolgariya","","Target","Erkak","Xusanxon - Konsultant","1-cv toxirlagani kelipti 2-bant","",1,0,0,1,4118000,230000,3888000,"","Bolgariya Zavod",""],["NO-4680","Ravshanbek Gazibayev","+998916073031","XBA To'lov qildi","Bolgariya, Turkiya","","Target","","Asadulloh - Konsultant","Antlaya 3 oy keyin Bolgariay Farmaseft","",0,0,0,1,618000,130000,488000,"","Bolgariya Zavod",""],["NO-5167","Abdulloh Toxtasinov","+998914941804","CV Topshirildi","Bolgariya","","Muslimbek","Erkak","Xusanxon - Konsultant","Andijon 18 yosh rus ingliz tilini biladi","",0,0,0,1,618000,0,618000,"","Bolgariya W/T",""],["NO-5287","Murodov Zayniddin","998953516767","Hujjatlar Jonatildi","Bolgariya","","Target","Erkak","Muhammad Rizo - Sotuv Menejeri","1-jizahdan ekan 58y ekan topshirip korish kere ishga 38 yillik tajripa bor ekan 2-chorshanba tel qil","",0,0,0,1,618000,530000,88000,"","Germaniya Fura",""],["NO-5442","Azizbek Alijonov","950733679","CV Topshirildi","Bolgariya","","Muslimbek","Erkak","Xusanxon - Konsultant","Yaqinda tolov qiladi","",0,0,0,1,618000,0,618000,"","Bolgariya W/T",""],["NO-5629","Muattar","978890016","XBA To'lov qildi","Bolgariya, Turkiya","","Target","Ayol","Muhammad Rizo - Sotuv Menejeri","1-Eri xotin ekan raxoti kamroq ishimiz bormi dedi xayitdan keyin kel;ish kere farhonadan 2-bir gapla","",0,0,0,1,618000,130000,488000,"","Antalya Sezon",""],["NO-5842","Xaliljon Xusanboev","939810025","Ishga qabul qilindi","Montenegro","","Target","Erkak","Mirsaidxo'ja - Call Center","Shanba kuni keladi","",0,0,0,1,618000,130000,488000,"","Bolgariya Zavod",""],["NO-5880","Abdulbosit Mirzajonov","+998935708353","Hujjatlar Jonatildi","Bolgariya","","Telegram","Erkak","Asrorbek - Sotuv/Hujjat Menejeri","Gulshoda Muzaffarovani eri","",1,0,0,1,8277180,510000,7767180,"","Bolgariya Villa",""],["NO-5896","Axrorjon Goziyev","906318600","Ishga qabul qilindi","Montenegro","","Target","Erkak","Mirsaidxo'ja - Call Center, Xusanxon - Konsultant","Ohak zavodi tavsiya qilinsin 2 tga sherigi bor","",0,0,0,1,618000,130000,488000,"","Bolgariya Zavod",""],["NO-5905","Mo’ydinov Ozodbek","+998878481555","XBA To'lov qildi","Bolgariya","","Sarafan","","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","Karaga","",0,0,0,1,618000,130000,488000,"","Bolgariya Zavod",""],["NO-5970","Rozaxon Abdullayeva","+998907685515","XBA To'lov qildi","Fransiya","","Target","Erkak","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","Bugun bu qizni suxbati bor aytib qoyilar","",1,0,0,1,618000,0,618000,"","Bola qarash",""],["NO-2169","Qodirali Tursunov","+998 94 430 39 71","Hujjatlar Jonatildi","Bolgariya, Germaniya","","Sarafan","","Asadulloh - Konsultant","","",1,0,0,1,3500000,1800000,1700000,"","Bolgariya Farmaseft",""],["NO-3181","Shuhrat Hojizamov","+998998051744","Hujjatlar Jonatilishga Tayyor","Bolgariya, Turkiya","","Telefon","Erkak","Xusanxon - Konsultant","","",1,0,0,1,4118000,4250000,-132000,"","Bolgariya Zavod",""],["NO-3714","Iqboljon Sattibayev","+998978342500","Hujjatlar Jonatildi","Bolgariya","","Sarafan","","Asadulloh - Konsultant","","",1,0,0,1,3912000,2212000,1700000,"","Bolgariya Farmaseft",""],["NO-3848","Nematov Kamron","+998 97 559 01 10","Vizaga Topshirildi","Turkiya","","Taqdimot","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","","",1,1,0,1,2118000,230000,1888000,"","Antalya",""],["NO-4084","Qodirov Islomjon","+998 90 166 21 97","Hujjatlar Jonatildi","Bolgariya","","Telegram","","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","","",1,0,0,1,4118000,230000,3888000,"","Bolgariya Transformator",""],["NO-4090","Muhammadqodirov Salohiddin","+998940606454","Hujjatlar Jonatildi","Bolgariya","","Telegram","","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","","",1,0,0,1,4118000,230000,3888000,"","Bolgariya Transformator",""],["NO-4957","Shokirov Nozimjon","+998905481575","Hujjatlar Jonatildi","Germaniya","","Target","Erkak","Asadulloh - Konsultant","","",0,0,0,1,618000,458500,159500,"","Germaniya Fura",""],["NO-5897","Yuldashev Hamidullo","904086610","Ishga qabul qilindi","Montenegro","","Target","Erkak","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","","",0,0,0,1,618000,130000,488000,"","Bolgariya Zavod",""],["NO-5936","Ergasheva Marifatxon","930012189","Hujjatlar Jonatildi","Bolgariya","","Sarafan","Ayol","Xusanxon - Konsultant","","",0,0,0,1,618000,255000,363000,"","Bolgariya Tikuvchi",""],["NO-5974","Matmusayev Xayitboy","880832479","XBA To'lov qildi","Bolgariya, Turkiya","","Instagram","Erkak","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","","",0,0,0,1,618000,0,618000,"","Bola qarash",""],["NO-5976","Saidov ixtiyor 2","+998901442615","XBA To'lov qildi","Turkiya","","","Erkak","Asadulloh - Konsultant, Xusanxon - Konsultant","","",0,0,0,0,2420000,1800000,620000,"","Turkiya 3 oylik",""],["NO-3466","Ogabek Mirzakarimov","","Hujjatlar Jonatildi","Germaniya","","Sarafan","","Xusanxon - Konsultant","100 naqt 100 karta","",0,0,0,0,2400000,1470000,930000,"","Germaniya W/T",""],["NO-5833","Azamov Fayzullo","","XBA To'lov qildi","Bolgariya","","Muslimbek","Erkak","Xusanxon - Konsultant","","",0,0,0,1,618000,0,618000,"","Bolgariya W/T",""],["NO-3750","Muhammadayubbek Misirahunov","949371565","Elchixonaga Hujjatlar Tayyor","Bolgariya","","Muslimbek","Erkak","Xusanxon - Konsultant","2008 yil rus ingliz tili","",1,0,0,1,7818000,2030000,5788000,"","Bolgariya Sezon",""],["NO-21","Abdulboriy","+998887951747","Jo‘nab ketdi","Rossiya","","Telefon","","Asadulloh - Konsultant","2002, Rus biladi, 3 oy Bolgariyada bo'lgan, Payshanba kelishi kerak 2-qilganimda ko’tarmadi 3-Pul to","",1,0,0,1,1500000,0,1500000,"","Rossiya Parnik",""],["NO-339","Xasanboy Qozoqov","+998887971997","Jo‘nab ketdi","Turkiya","","","","Xusanxon - Konsultant","Serbiya qurulish  Pulidan gapirin aka chorshanba keladi kotarmadi Beton, G’isht.","",1,1,1,1,3618000,150000,3468000,"","Turkiya Qurilish","@qalqon1997"],["NO-680","Abdullajon","997987471","Jo‘nab ketdi","Turkiya","","Sarafan","","Xusanxon - Konsultant","CV tayyorlandi kotarmadi chorshanba tolov qiladi ojidaniya kotarmadi","",1,1,1,1,5380000,150000,5230000,"","Turkiya Qurilish",""],["NO-774","Uktam","979944002","Jo‘nab ketdi","Turkiya","","Target","","Xusanxon - Konsultant","polsha 1.5 yil  seshanba  deport turkiyaga qurilish molyar","",1,1,1,1,3016000,50000,2966000,"","Turkiya Qurilish",""],["NO-970","Sobirjonov Gayratbek","+998330668030","Jo‘nab ketdi","Turkiya","","Telefon","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","asadulloh akani nomerini berdik turkiya qurilish uchun  mono markazga asadulloh akani oldiga ketti  ","",1,1,0,1,4618000,150000,4468000,"","Turkiya Qurilish","+998330668030"],["NO-1474","Sanjar Zunduev","+998889376707","Bekor qildi","Bolgariya, Turkiya","","Telegram","","Xusanxon - Konsultant","1-kotarmdi dushanba kuni keladi","",0,0,0,1,618000,50000,568000,"","Antalya",""],["NO-2971","Muzaffar Nematov","+998885711570, +998905711570","Jo‘nab ketdi","Bolgariya","","Target","Erkak","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","1-yanagi hefta keladi E prava bor tajriba yoq 2-mablagi yoq bahorgacha minishdi organib aloqaga chiq","",0,0,0,1,618000,130000,488000,"","Bolgariya Zavod",""],["NO-3604","Feruza Boltaboyeva","+998950630708","Bekor qildi","Turkiya","","Target","","Muhammad Rizo - Sotuv Menejeri","1-keying duyshanba tel qilish kere, Yevropa va Milliy taomlar, sovuq issiq tsex.  3-shanba qsek kota","",0,0,0,0,618000,150000,468000,"","Antalya",""],["NO-3883","Zokirov Zikirillo","902919863","Bekor qildi","Turkiya","","Sarafan","","Xusanxon - Konsultant","Nilufar opa odami 27 ingliz tili rus tili  Oquv markazda Excell da  tolov qilish kk  hujjatini tayyo","",0,0,0,1,618000,0,618000,"","Antalya",""],["NO-4078","Axmadillo Ahmatjonov","+998998776260","Bekor qildi","Montenegro","","Target","","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","1- transfarmator  reklama","",0,0,0,0,618000,130000,488000,"","Bolgariya Transformator",""],["NO-4885","Toychiyev Axrorbek","507275517","Bekor qildi","Montenegro","","Target","Erkak","Muhammad Rizo - Sotuv Menejeri","1-xba tolov qigani banka ketyapti  xba tolov qildi 2-rustilni organip tel qiladi","",0,0,0,1,618000,130000,488000,"","Bolgariya Transformator",""],["NO-5913","Umarov Shavkatbek","+998872551017","Jo‘nab ketdi","Bolgariya","","Sarafan","Erkak","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","Nosir aka tanishi","",1,1,0,1,4278000,1910000,2368000,"","Turkiya 3-oy",""],["NO-5934","Murodil Olimov","+998509090239","Jo‘nab ketdi","Turkiya","","Telegram","Erkak","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","1- ofisga keladi 2-shanba keladi","",1,1,0,0,2448000,1830000,618000,"","Turkiya 3-oy",""],["NO-690","Doniyorbek Asqarov","+998902598555","Bekor qildi","Turkiya","","Sarafan","","Asadulloh - Konsultant, Xusanxon - Konsultant","","",0,0,0,0,618000,0,618000,"","Turkiya Qossop",""],["NO-4","Husanboy Abdurahmonov","+998947013310","Shartnoma qildi","Arab","","Telefon","Erkak","Asadulloh - Konsultant","Arab Davlatlari, Hudoberdining oshnasi 2-Dushanbaga keladi/ CV toldirib beradi → Interview’ga chaqir","Hudoberdi bilan keladi",0,0,0,0,0,0,0,"","","@khsn06"],["NO-69","Akbarjon","+998970152201","CV Topshirildi","Bolgariya","","Yarmarka","","Asadulloh - Konsultant","BC . Bogʻishamol ozi telefon qiladi 2- Ertaga keladi 3- shartmnoma qildi 4-ko’tarmadi","",0,0,0,0,0,0,0,"","",""],["NO-95","Avazbek Qurbonov","+998911524737","Hujjatlar Jonatilishga Tayyor","Bolgariya","","Yarmarka","","Asadulloh - Konsultant, Xusanxon - Konsultant","balgariya bc  e categoriyada prava bor rus tilini biladi dushanba keladi Kotarmadi  Serbiya  kotarma","",0,0,0,0,0,0,0,"","",""],["NO-156","Asranov Zokirbek aka","+998907718889","Shartnoma qildi","Turkiya","","Telegram","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","Turkiya, 35, Til yoq. Bugun keladi 6 gacha. Seshanba 9 larda keladi Chorshanbaga ertalabda keladi oc","",0,0,0,0,0,0,0,"","",""],["NO-224","Abdulloh Xusanboyev","+998 91 160 4200","CV Topshirildi","Serbiya","","Telegram","Erkak","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","Germaniyada ish uchun, Biotibbyot muhandisligi kollej diplomi bor, 26 y,  Nemis tili biladi. 12ga ke","",0,0,0,0,0,0,0,"","","@Biomedical_99"],["NO-266","Bahodirov Gulomiddin","+998910610691","Shartnoma qildi","Bolgariya, Polsha","","Telegram","","Xusanxon - Konsultant","ertalab suhbatga keldi serbiya boyicha malumotlar tgdan tashlandi maslahat qilib tel qiladi 4.11.202","",0,0,0,0,0,0,0,"","",""],["NO-303","Shoyatbek","+998886028182","Shartnoma qildi","Serbiya, Turkiya","","Telegram","","Xusanxon - Konsultant","Rus tili, Qurilish. Payshanba kechkacha keladi  ishdan ruxsat olib keladi kelyapti 1-Sherigi, ayol k","",0,0,0,0,0,0,0,"","",""],["NO-317","Rahmonov Xafizulloh","+998916155953","Shartnoma qildi","Serbiya, Turkiya","","Telegram","Erkak","Muhammadayub - Call Center","serbiyaga shartnoma qildi   Tg orqali yangi yildan keyin aloqaga chiqilsin 3- duwanba keladi","",0,0,0,0,0,0,0,"","","Hafizulloh"],["NO-329","Bozarov Ulugbek","+998880678007","Hujjatlar Jonatildi","Serbiya","","Sarafan","","Xusanxon - Konsultant","1-qism tolamoqda","",1,0,0,1,0,0,0,"","",""],["NO-331","Abdurasul Qo’ldashev","+998870870404","Shartnoma qildi","Serbiya","","Telefon","","Xusanxon - Konsultant","Amakisini o’g’li bn ketadi 3- ko’tarmadi","",0,0,0,0,0,0,0,"","","884184140"],["NO-332","Islombek Qoldoshev","+998907690929","Shartnoma qildi","Serbiya","","Telegram","","Xusanxon - Konsultant","dushanba tolov qiladi kecki voht shartnoma qilgan akalar 3- ko’tarmadi","",0,0,0,0,0,0,0,"","",""],["NO-338","Umarov Lutfillo","+998774956272","Shartnoma qildi","Rossiya","","Sarafan","","Xusanxon - Konsultant","rossiya qadoqlash 53 rus tilini biladi ertaga tolov qiladi   10 kundan keyin  tolov qiladi kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-372","Otabek","+998937872524","1 - Qism To'landi","Bolgariya, Montenegro","","Sarafan","","Asadulloh - Konsultant","Sivarka rus tilini biladi bugun keladi Sivarka, Zelenamostlik aka 2-ishga qabul qilinmagan  3-BUgun ","",1,1,0,1,0,0,0,"","",""],["NO-388","Azamjon Ikromov","+998954904224","Hujjatlar Jonatildi","Bolgariya","","Telegram","Erkak","Xusanxon - Konsultant","juma kelyapdi Payshanba kuni keladi, 27-Noyabr juma kotarmadi kotarmadi kecro tel qlaadi 5 - Antalya","",0,0,0,0,0,0,0,"","",""],["NO-460","Habibulloh","+998 94 900 66 00","Shartnoma qildi","Bolgariya","","Telegram","","Xusanxon - Konsultant","korea boyicha narsalar soraldi diplomi yoq narmanni joyga bormoqchi ekan Fura, 1oyda oladi E, Shrtno","",0,0,0,0,0,0,0,"","","@Abibulla_6600"],["NO-488","Madraximov Jaloliddin","+998 93 278 7676","Shartnoma qildi","Polsha","","Telegram","","Xusanxon - Konsultant","Haliroq keladi xo’jayini bilan. O’g’li sarvar akada o’qidi Jaloliddin  Madiraximov 44 yosh O’g’li sa","",0,0,0,0,0,0,0,"","","8183"],["NO-515","Ergashev Khusniddin Najmiddin Ugli","+998958837676","Shartnoma qildi","Polsha","","Sarafan","","Xusanxon - Konsultant","Daniyaga qiziqyapdi 31 yosh Polshaga keyingi hafta tolov qiladi kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-802","Maxmudov Suxbatillo","+998931401777","Shartnoma qildi","Turkiya","","Sarafan","","Asadulloh - Konsultant, Xusanxon - Konsultant","yoshi 53 turkiya qurilish molyar seshanba tolov qiladi. chorshanba tolov qiladi Payshanba keladi  Ya","",0,0,0,0,0,0,0,"","",""],["NO-811","Mirzohid Abdurahmonov","+998 90 142 1747","Shartnoma qildi","Serbiya, Turkiya","","Telefon","","Asadulloh - Konsultant, Xusanxon - Konsultant","Serbiya qurilish Mirzohid aka Seshanba kechka yaqin keladi kotarmadi tgdan video tashlashi kk puli o","",0,0,0,0,0,0,0,"","",""],["NO-1216","Abdulaziz Qobulov","992703437","Shartnoma qildi","Bolgariya","","Bot orqali","","Xusanxon - Konsultant","Elektirik  Andijonda juma keladi 2-kotarmadi 3-boshqa yonalishga javob beryapdi 4-dushanba keladi | ","",0,0,0,0,0,0,0,"","",""],["NO-1226","Abdulloh Mamasiddiqov","904059083","Shartnoma qildi","Serbiya","","Telefon","","Xusanxon - Konsultant","Fargona 20 yosh santexnik boglanib bolmadi teli ociq","",0,0,0,0,0,0,0,"","",""],["NO-1238","Sardorbek","+998905240444","Shartnoma qildi","Turkiya","","Target","Erkak","Asadulloh - Konsultant, Muhammadayub - Call Center","dushanba keladi  soat 6 gacha keladi. Antalya Menejer Zagranga topshirib, Migraasiya tolovi Seshanba","",0,0,0,0,0,0,0,"","",""],["NO-1318","Akmaljon Ergashev","+998940169445","Shartnoma qildi","Bolgariya, Polsha","","Target","","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","1-seshanba keladi  2-chorshanba keladi 3-yangi yildan keyin keladi  metan gaz yoq 4 xozir kelaman de","",0,0,0,0,0,0,0,"","",""],["NO-1532","Elyorbek Islomov","+998888338484","Shartnoma qildi","Bolgariya","","Target","","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","1-shanba keladi Sharxonlik sheriglari ham bor  2-Abedan keyin keladi 3-Chorshanba Malumotlar bn kela","",0,0,0,0,0,0,0,"","",""],["NO-1653","Karimov Kamoldin","+998 94 639 1777","Shartnoma qildi","Bolgariya","","Target","","Asadulloh - Konsultant","Avval Antalya, Oshpaz yordamchisi. Keyin Bolgariya. Rus tili ozgina biladi.","",0,0,0,0,0,0,0,"","",""],["NO-1655","Shahobutdinov Soyibjon","+998 90 548 4646","Shartnoma qildi","Bolgariya, Turkiya","","Target","","Asadulloh - Konsultant, Asrorbek - Sotuv/Hujjat Menejeri","Avval Antalya, Oshpaz yordamchisi. Keyin Bolgariya. Rus tili ozgina biladi. 2-kotarmadi 3-kotarmadi ","",0,0,0,0,0,0,0,"","","+998 90 548 4646"],["NO-1660","Komiljonov Qudratillo","+998 91 068 3417","Shartnoma qildi","Serbiya","","Sarafan","","Asadulloh - Konsultant, Xusanxon - Konsultant","Tez ketish kerak, Serbiayaga shartnoma qildi, keyin Shengega o’tib ketisa bo’ladi. kotarmadi ozi tel","",0,0,0,0,0,0,0,"","",""],["NO-1894","ilyosbek","932570201","Ishga qabul qilindi","Turkiya","","Telegram","Erkak","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","Duahanba keladi aniq  2-duyshanba yani bugun abetlargacha keladi 3-SESHANBA OSHNASI BILAN KELADI 4-d","",0,0,0,0,0,0,0,"","",""],["NO-1961","Ulugbek Sobirov","+998958351565","Shartnoma qildi","Bolgariya","","Target","","Xusanxon - Konsultant","Elyor aka oshnasi Razgom darajada Ustachilik va sklad Chorshanba Malumotlar bn keladi Tolov ham ashi","",0,0,0,0,0,0,0,"","",""],["NO-2304","Kosimova Nigora","+998905299131","Hujjatlar Jonatildi","Germaniya","","","","Xusanxon - Konsultant","haliro keladi  1-kotarmadi","",0,0,0,0,0,0,0,"","","905299131"],["NO-2316","Sobirjonov jasurbek","993006174","Shartnoma qildi","Bolgariya","","Sarafan","","Xusanxon - Konsultant","1-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-2350","Jamoliddinov Biloldin","+998 90 008 4811","Shartnoma qildi","Germaniya, Serbiya","","Sarafan","Erkak","Muhammad Rizo - Sotuv Menejeri","Dushanba keladi. 2-Dadasi bilan Payshanba abettan keyinla o’tadi, Til kursi 3- Keldi dadasi bilan ju","",0,0,0,0,0,0,0,"","",""],["NO-2360","Mumtozbegim","","Viza Rad Etildi","Turkiya","","Target","","Asadulloh - Konsultant","Turkiya til kursi","",1,1,0,0,2400000,500,2399500,"","Turkiya Til",""],["NO-2470","Hudoyberdiyev Bekmurod","+998 94 104 6868","Shartnoma qildi","Bolgariya, Polsha","","Sarafan","","Asadulloh - Konsultant, Asrorbek - Sotuv/Hujjat Menejeri","Bolgariyaga va Polasha. Rus yaxshi. dushanba to’lov qiladi qilib qoyadi","",0,0,0,0,0,0,0,"","",""],["NO-2484","Holmatov Jaxongir","+998 99 615 5434","Shartnoma qildi","Bolgariya, Polsha","","Sarafan","","Asadulloh - Konsultant","Polsha va Bolgariya, Gazo-elektrosvarshik. Sarvar aka tanishi 2-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-2877","Tursunbayev Xojiakbar","+998959338900","Shartnoma qildi","Turkiya","","Target","","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","1-ertaga yoki indinga keladi andijonga namangandan andijonga keldi xozir keladi 2-dushanba yoki sesh","",0,0,0,0,0,0,0,"","",""],["NO-3182","Timur Mamatkazin","+998974740774","Hujjatlar Jonatildi","Bolgariya, Turkiya","","Telefon","","Xusanxon - Konsultant","1-band ekan zagrandi aytyotsam qoyib qoydi 2-ertaga keladi","",0,0,0,1,0,0,0,"","",""],["NO-3298","Bobur yoldashev","914765382","Shartnoma qildi","Bolgariya","","Target","","Muhammad Rizo - Sotuv Menejeri","1-duyshanba keladi ofizga fura boyicha 2-chorshanba keladi 3-bugun kelad 1.2 soatlarda fura boyicha ","",0,0,0,0,0,0,0,"","",""],["NO-3339","Yunusov Lazizjon","+998 90 210 2173","XBA To'lov qildi","Bolgariya","","Target","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","Keldi - 53 yosh, Zavodda ishledi, qo’qonlik. 2 o’g’li paxtachilik, Bopshqa sheriklari ham bor 3-kota","",0,0,0,1,0,0,0,"","",""],["NO-3401","Yoldoshboyeva Odina","772357907","Shartnoma qildi","Bolgariya","","Muslimbek","","Xusanxon - Konsultant","Muslim akani odamini tanishi 2- seshanba rasm va tolov qilishga keladi 3-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-3424","Фозилов Баходир","+998979565050","CV Topshirildi","","","","","Muhammad Rizo - Sotuv Menejeri","Асака2-kotarmadi kotarmadi kelmagan ham","",0,0,0,0,0,0,0,"","","+99894 103 10 90"],["NO-3429","Jasur Abdullayev","+998 88 996 1918","Shartnoma qildi","Bolgariya, Turkiya","","Sarafan","","Asadulloh - Konsultant, Xusanxon - Konsultant","Antalyaga Chorshanba gacha javobini aytishi kerak. Rus tili biladi shartnoma qilishga keladi Antalya","",0,0,0,0,0,0,0,"","",""],["NO-3497","Muhammad Ali","889599499","Shartnoma qildi","Turkiya","","Target","","Asrorbek - Sotuv/Hujjat Menejeri","1-3 kishi bosh vaqt qilib keladi  oldin ham Bolgariyada ishlashga 2- kelishyapti 1 haftada tolov bol","",0,0,0,0,0,0,0,"","",""],["NO-3682","Zuhriddin F","+998 91 045 9900","Shartnoma qildi","Bolgariya","","Muslimbek","","Xusanxon - Konsultant","Rus tili biladi","Suhbatga chaqirilisin muslimbek aka tolov qilgan",0,0,0,0,0,0,0,"","",""],["NO-3683","Yusupov Ikromjon","+998 88 258 9707","XBA To'lov qildi","Bolgariya","","Sarafan","","Asrorbek - Sotuv/Hujjat Menejeri, Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","Bolgariay, rus tili yaxshi. Shanba tel qilinsin 2- Shartnoma Bolgariyaga qilindi tolov qilingan 3- t","",0,0,0,1,0,0,0,"","",""],["NO-3684","Jo’raboyev Mirjalol","+998 97 702 6777","XBA To'lov qildi","Bolgariya","","Sarafan","","Asadulloh - Konsultant, Xusanxon - Konsultant","Rus tili bilmaydi. Bolgariyaga. Shanba keladi. Antalyaga ham qiziqib turibti. 2- Bolgariyaga shartno","",0,0,0,0,0,0,0,"","",""],["NO-3764","Muhammadali Numonov","901401114","Shartnoma qildi","Turkiya","","Target","","Muhammadayub - Call Center, Xusanxon - Konsultant","1-bugun keladi abedgacha, keldi 33y,  Rus tili oz,  2-shanba qsek pulga qiynal yapman shunu mayda ra","",0,0,0,0,0,0,0,"","",""],["NO-3775","Mirzakarimov Ismatillo","954700698","Shartnoma qildi","Turkiya","","Sarafan","Erkak","Mirsaidxo'ja - Call Center, Xusanxon - Konsultant","1-OCHRILGAN  2-o’chirilgan","",0,0,0,0,0,0,0,"","",""],["NO-3816","Sardorbek Mamasoliyev","70 036 1137","Shartnoma qildi","Turkiya","","Taqdimot","","Asadulloh - Konsultant, Xusanxon - Konsultant","18yosh rus tili biladi (Antaliya) CV tayyorlandi puldan ozgina muammo ochrilgan","",0,0,0,0,0,0,0,"","",""],["NO-3817","Teshaboyev Xurshidbek","+998 93 050 6627","Shartnoma qildi","Bolgariya","","Taqdimot","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","Antaliya—Bolgariya Fura  1-bugun keladi abedan ovval 2- chip kartaga topshirmadi XBA tolovgayam pul ","+998938076626",0,0,0,0,0,0,0,"","",""],["NO-3820","Qambarov Ilhomjon","+998 93 780 09 56","Vizaga Topshirildi","","","Taqdimot","","Asadulloh - Konsultant, Xusanxon - Konsultant","Antaliya povar KIPRda ishlagan turk rus tili biladi  1-boshqa yonalish","",0,0,0,0,0,0,0,"","",""],["NO-3868","Sayfullo Abdurashidov","951103735","Shartnoma qildi","Turkiya","","Telegram","","Xusanxon - Konsultant","CV tayyorlandimi boglanib bolmadi","",0,0,0,0,0,0,0,"","",""],["NO-3871","Mirzalimov Avazbek","971648800","Vizaga Topshirildi","Turkiya","","Sarafan","","Xusanxon - Konsultant","21 yosh  2-ochirilgan","",0,0,0,0,0,0,0,"","",""],["NO-3886","Abdukabirov Akbarjon","870016006","XBA To'lov qildi","Turkiya","","Telegram","","Xusanxon - Konsultant","18 yosh otoxonni kondirdi CV uchun  toladi ertaga keladi jumma suxbat deb aytildi","",0,0,0,0,0,0,0,"","",""],["NO-3893","Abduqodir Uluqshayev","951862315","Shartnoma qildi","Bolgariya","","Sarafan","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","Furachi boshqa ishlarga iziqyapdi 2-ochirilgan yanagi haftaga tolov qib qoladi","",0,0,0,0,0,0,0,"","",""],["NO-3898","Xurshidbek Nabiyev","+998943855354","Shartnoma qildi","Bolgariya","","Telegram","","Asadulloh - Konsultant, Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","1- Elektrosetda ishledi 8 yil staji bor Shanba keladi Bogariya va Germaniyaga topshirish kerak. CV t","",0,0,0,0,0,0,0,"","",""],["NO-3906","Abdulaziz Abduazizov","+998 91 041 1161","Shartnoma qildi","Turkiya","","Sarafan","Erkak","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","aka shartnoma qildi master turkiyaga  1-kotarmadi  2-payshanba aytip yuborish kere suhpat qacgan bol","",0,0,0,0,0,0,0,"","",""],["NO-4053","noraliyev gayratbek","979871033","Shartnoma qildi","Bolgariya","","Telegram","","Xusanxon - Konsultant","1 haftada tolov qladi turkiya va boshqa joylarga topshirish kk","",0,0,0,0,0,0,0,"","",""],["NO-4085","Mamajonov Alisher","+998 91 174 77 74","Ishga qabul qilindi","Turkiya","","Yarmarka","","Sarvarbek - Sotuv Menejeri","Ahmadhonov hayrullo akani tanshi bu akaga ham cv chiqarib bersak suxbatdan otgandan keyin hamma tolo","",0,0,0,0,0,0,0,"","",""],["NO-4093","RUSTAMJON SATTIKULOV","881699300","Shartnoma qildi","Bolgariya","","Telefon","","Muhammadayub - Call Center, Xusanxon - Konsultant","SHANBA KELIB QOLSHI MUMKUN  2- rusgga cq ketptla okamz","",0,0,0,0,0,0,0,"","",""],["NO-4233","Nurillo Niyozaxunov","916032276","Shartnoma qildi","Bolgariya","","Telegram","Erkak","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","1-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-4979","Daliyev Jaxongir","944620392","Hujjatlar Jonatildi","Bolgariya","","Telegram","Erkak","Xusanxon - Konsultant","1-Ukasi hambor 2-kotarmadi  3-Shartnoma qilgan 4-Payshanba keladi sudlanmaganlik  5-ko’tarmadi","",0,0,0,0,0,0,0,"","",""],["NO-4981","Ismoilov olimjon","900031314","Shartnoma qildi","Turkiya","","Telegram","Erkak","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","1-kotarmadi akasi bilan maslahatlashib koradi Akasi ham shartnoma qilgan Daliyev Jahongir","",0,0,0,0,0,0,0,"","",""],["NO-5018","Sodqov Yaxyobek","905717796","Hujjatlar Jonatilishga Tayyor","Bolgariya, Germaniya","","Target","Erkak","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","1-shanba yoki duyshanba keladi 2-yoldekan kelyaptikan 3-chorshanba keladi shartnoma qigani 4-juma ke","",0,0,0,0,0,0,0,"","",""],["NO-5055","Muhammadqodir Fozilov","+998880993737","1 - Qism To'landi","Germaniya","","Sarafan","Erkak","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","Sherigi bn keldi sherigi sarvar akani tanishi 2-chorshanba keladi shartnoma qigani 3-payshanba ertal","sherigi  bilan keladi yaxyobek bilan",1,0,0,0,0,0,0,"","",""],["NO-5073","Gufroniddin","+998945518110","Shartnoma qildi","Bolgariya","","Target","","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","1-chorshanba keladi ofizga 2-xozir boraman dedi 3-5 6yil tajriba rus tili 4- kotarmadi  5- KOTARMADI","",0,0,0,0,0,0,0,"","",""],["NO-5077","Raimjonov Sultonmurod","+998914846383","Shartnoma qildi","","","Sarafan","Erkak","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","Nosirjon akani tanishi 1 2 kunda tolovga keladi","",0,0,0,0,0,0,0,"","",""],["NO-5081","Khamitov Doniyorjon","+998916034322","Shartnoma qildi","","","Sarafan","Erkak","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","1- Akhmatkhanov Khayrulla akani tanishi","",0,0,0,0,0,0,0,"","",""],["NO-5256","Olimov Murodiljon","+998941950241","XBA To'lov qildi","","","Target","Erkak","Sarvarbek - Sotuv Menejeri","TELEGRAMDAN YOZILDI  shartnoma qildi","",1,0,0,1,0,0,0,"","","+79118237070"],["NO-5443","Isaqov Rozimuhammad","888034242","Shartnoma qildi","Bolgariya","","Sarafan","Erkak","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","KOTARMADI","",0,0,0,0,0,0,0,"","",""],["NO-5683","Uraimov Sardorbek","934781434","Shartnoma qildi","Bolgariya","","Muslimbek","Erkak","Xusanxon - Konsultant","4-kurs tibbiyot","",0,0,0,0,0,0,0,"","",""],["NO-5694","Ketmonova Dilnoza","+998942877877","CV Topshirildi","Turkiya","","Telegram","Ayol","Asrorbek - Sotuv/Hujjat Menejeri","36. y, Bollar bilan yaxshi. Abettan keyin keladi. Payshanba 2-boglanib bolmadi","",0,0,0,0,0,0,0,"","",""],["NO-5730","Mamuraxon","+998911614244","Shartnoma qildi","Bolgariya","","Target","Ayol","Mirsaidxo'ja - Call Center","1-Ertaga keladi 2-kelyapti KFC ni oldida 3-XBA tolov qiladi 4-O’chirilgan 5-XBA tolovni amalga oshir","",0,0,0,0,0,0,0,"","",""],["NO-5744","Saydillo Nazarov","+998940452784","Shartnoma qildi","Bolgariya, Turkiya","","Sarafan","Erkak","Xusanxon - Konsultant","Bubur aka tanishi 2-rolda edim toshkentdan qaytyapman dedi  3-ochirilgan","",0,0,0,0,0,0,0,"","",""],["NO-5745","Asqarov Abdulali","+998947566060","Shartnoma qildi","Turkiya","","Sarafan","Erkak","Xusanxon - Konsultant","Bobur aka tanishi","",0,0,0,0,0,0,0,"","",""],["NO-5787","YANGIBOYEV MUHAMMADJON","500015010","Shartnoma qildi","Albaniya","","Telegram","Erkak","Mirsaidxo'ja - Call Center","Bugun kealdi","",0,0,0,0,0,0,0,"","",""],["NO-5872","Urolov Akmaljon","+998903711008","Hujjatlar Jonatilishga Tayyor","Bolgariya","","Telegram","Erkak","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","1-aparel oyga tugaguncha tolov qiladi qoganini","",1,0,0,0,0,0,0,"","",""],["NO-5881","Sobirjonov Gayratbek (2)","+998330668030","Hujjatlar Jonatildi","Bolgariya","","Telefon","Erkak","Asadulloh - Konsultant, Xusanxon - Konsultant","1-asadulloh akani nomerini berdik turkiya qurilish uchun  mono markazga asadulloh akani oldiga ketti","",0,0,0,0,0,0,0,"","","+998330668030"],["NO-5933","Bahtiyardjan","+998979971182","Ishga qabul qilindi","","","Target","Erkak","Mirsaidxo'ja - Call Center","1-Andijon 43yosh rus tili bemalol dushanba yoki seshanba keladi  2-Keyingi xafta Dushanba keladi 3-B","",0,0,0,0,0,0,0,"","",""],["NO-5964","Saidov Ixtiyorbek","+998901442615","Shartnoma qildi","Bolgariya, Turkiya","","","Erkak","","Avval Turkiya, keyin Oxak Zavodi","",0,0,0,0,0,0,0,"","",""],["NO-5975","Saidov Ixtiyor","Телефон номер /  Mobile number\t+998901442615\tE – mail adress\tolamidunyoo@gmail.com","XBA To'lov qildi","Bolgariya","","Sarafan","Erkak","Asadulloh - Konsultant, Xusanxon - Konsultant","Asadillo aka tanishi","",0,0,0,1,0,0,0,"","",""],["NO-5997","Hakimov Murodiljon","+99893 858 9777","Ishga qabul qilindi","Bolgariya","","Target","Erkak","Mirsaidxo'ja - Call Center","1- keyingi hafta boshiga tolov qiladi XBA 2-tom yopyapdi ekan","",0,0,0,0,0,0,0,"","",""],["NO-6109","Muhammadrasul","976599189","Shartnoma qildi","Bolgariya","","Telegram","Erkak","Mirsaidxo'ja - Call Center","1-Bugun keladi 2-Ko’tarmadi 3-boshqa yo’nalishga javob beryapti 4-Dushanba kuni abeddan keyin keladi","",0,0,0,0,0,0,0,"","",""],["NO-6088","Avazbek","+998950765883","Hujjatlar Jonatildi","","","Target","Erkak","Asrorbek - Sotuv/Hujjat Menejeri","1-yolda kelyapti","",0,0,0,0,0,0,0,"","",""],["NO-6397","Valentina Gnezdilova","937151166","Shartnoma qildi","Bolgariya","","Telegram","Ayol","Xusanxon - Konsultant","Eri ham bor BC pravasi bor erini","",0,0,0,0,0,0,0,"","",""],["NO-6884","Азизбек","+998900627900","Shartnoma qildi","Montenegro","","Target","Erkak","Muhammad Rizo - Sotuv Menejeri","1-chorshanba keladi ofizga 10.00 lada keladi 2-yolda kelyapti 3-bugun erta tolov qiladi yoki duyshan","",0,0,0,0,0,0,0,"","",""],["NO-6932","Музаффар","901435454","Shartnoma qildi","Montenegro","","Target","Erkak","Muhammad Rizo - Sotuv Menejeri","1-Seshanba keladi ofizga 10 lada keladi 2-juma kuni video va tolov boladi 3-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-32","Sardor","+998946450057","Suhbat","Bolgariya","","Telefon","","Asadulloh - Konsultant","39 yoshda, BC bor, Bolgariya 2- Pul topolmayabti (412 to’lab tursin, keyin qolganini to’laydi) kechk","",0,0,0,0,0,0,0,"","",""],["NO-51","Muhammad Yusuf","+998990677692","Suhbat","Bolgariya","","Sarafan","","","Bolgariya svarka, Germaniya mavsumiy 2- Oshnasini ruscha suxbattan o’tib berishga ko’ngdirib, biz bi","",0,0,0,0,0,0,0,"","","Tg"],["NO-56","Xondamir","+998979761415","Suhbat","Bolgariya","","Yarmarka","","Asadulloh - Konsultant","Bolgariya, akumulyator. BC, Mebel 1- ko’tarmadi, bugun keladi eski shaxardan/ Ko’rishtik, ertaga she","",0,0,0,0,0,0,0,"","",""],["NO-67","Qamariddin","+998934233322","Suhbat","Bolgariya","","Yarmarka","","Asadulloh - Konsultant","Qurilish 15. Sontexnika , kafel, elektr mantaj svarka elektr dugavoy , rus sertifikat .   boshqa joy","",0,0,0,0,0,0,0,"","",""],["NO-70","Islombek","+998873373060","Suhbat","Rossiya","","Yarmarka","","Asadulloh - Konsultant","Bolgariya, Qurilish  abetdan keyin keladi lakatsiya tashaldi. 1-Keldi Rossiyani o’ylab ko’radi. 2- i","",0,0,0,0,0,0,0,"","",""],["NO-77","_","+998 88 169 0888","Suhbat","Rossiya","","Yarmarka","","Asadulloh - Konsultant","Er-xotin Bolgariyada ishlamoqchi, Rossiyaga borib turishadi. bugun kelmasa tel qilinsin. kotarmadi 1","",0,0,0,0,0,0,0,"","",""],["NO-78","Isomiddin aka","+998999877062","Suhbat","Aniq emas","","Sarafan","","","Shvetsiyaha o'tib ketadi, oshnasi bilan keldi. Juma keladi","",0,0,0,0,0,0,0,"","",""],["NO-79","Farxod","+998937876637","Suhbat","Sloveniya","","Telefon","","","Seshanba keladi telefon qilindi kelyapdi 29.10 keldi sloveniyaga qiziqyapdi maslahatlawib tel qladi ","",0,0,0,0,0,0,0,"","",""],["NO-80","Oyatillo","+998907702331","Suhbat","Arab","","Telegram","","","Arab davlatlariga ketmoqchi, Yevropadan zerikipti, Sharxondan 2, 3 larga keladi. keldi 24.2015 20 ku","",0,0,0,0,0,0,0,"","",""],["NO-81","Kozimjon Gofurov","+998905448776","Suhbat","Bolgariya","","Telegram","","Muhammad Rizo - Sotuv Menejeri","Rus tilini biladi, Bugun ulgurmasa, ertaga keladi. Yevropaga qiziqib 25.10 keldi bc bor bogbonlikga ","",0,0,0,0,0,0,0,"","",""],["NO-111","Axror Xolmatov","+998945627422","Suhbat","Serbiya","","Onlayn Ariza","","Asadulloh - Konsultant","G‘ishteruchi bloklangan boglanib bolmadi 2- 1 soatlarda keladi, Keldi sherigi bor, 1 2 kunda maslaha","",0,0,0,0,0,0,0,"","","11111"],["NO-115","Bobur","+998996479909","Suhbat","Arab","","Sarafan","","","Arab davlatlariga. Ertaga tel qilinsin kotarmadi 2-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-124","Iftixor","+998930527311","Suhbat","Bolgariya","","Sarafan","","","Bolgariya yozgi mavsum,  qaytarib yuboradi kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-126","Umidjon aka","+998938955444","Suhbat","Bolgariya","","Sarafan","","Xusanxon - Konsultant","yoshi 50 da hamma ish qiloradi rus tili muammo emas nosir aka tanishi oshnasi ham bor billa kelishdi","",0,0,0,0,0,0,0,"","",""],["NO-144","Fayzullo Numonov","+998916117333","Suhbat","Germaniya","","Onlayn Ariza","","Xusanxon - Konsultant","Germaniya bugun keladi 4.11.2025 1- Qilib tusholmadim 2- Rus muloqot darajasida, Inlgiz tili endi bo","",0,0,0,0,0,0,0,"","","@Fayzi0726"],["NO-165","Ahmadillo","+998934272128","Suhbat","Aniq emas","","Onlayn Ariza","","Asadulloh - Konsultant","Qatar, Rossiya Moskva , Bolgariya yevropa chorshanba  kelyapdi soat 2 larga Rus tili bemalol,  Kotar","",0,0,0,0,0,0,0,"","","+998934272128"],["NO-173","Murodbek","+998956676300","Suhbat","Turkiya","","Telegram","","Asadulloh - Konsultant","Qaytardim ko'tarmadi. Chorshanba (5.11.2025) keladi. kotarmadi juma kuni tel qilinsin boshqa yonalis","",0,0,0,0,0,0,0,"","",""],["NO-185","Karimova Shaxnoza","+998914804883","Suhbat","Bolgariya","","Telegram","Ayol","Xusanxon - Konsultant","Rus tili yaxshimas, Bolgariya, Karimova Shaxnoza, Chorshanba, abettan keyin.  kelyapdi Turkiya, Bolg","",0,0,0,0,0,0,0,"","",""],["NO-236","Ergashev Nuriddin","+998916207574","Suhbat","Bolgariya","","Sarafan","","Muhammad Rizo - Sotuv Menejeri","BC bor, Rus bor, Bolgariya qiziqyabti, Nosir aka tanishi 35-yosh Haydovchilik boyicha vakansiya istt","",0,0,0,0,0,0,0,"","",""],["NO-247","Omadbek Abdugafforov","+998948044747","Suhbat","Bolgariya","","Sarafan","","Xusanxon - Konsultant","3 oyda E chiqadi. Koreyaga o'ylayabti.  Fevralda aloqaga chiqilsiin","",0,0,0,0,0,0,0,"","",""],["NO-271","Ulugbek Nuraliyev","+998934299622","Suhbat","Turkiya","","Telegram","","Xusanxon - Konsultant","Turkiyaga, 58 yosh, yengil ishlar. Ish chiqib qolsa aytilsin. keladi. Dushanba  sherigi bilan keladi","",0,0,0,0,0,0,0,"","",""],["NO-279","Islomjon aka","+998 91 791 6000","Suhbat","Koreya","","Telefon","","Xusanxon - Konsultant","Bolgaria, 34 y. 1- Ko’tarmadi ortogi bilan maslahat qilib tel qiladi va billa keladi  2- Keldi, Kore","",0,0,0,0,0,0,0,"","",""],["NO-293","Baxti Salim","+998930675505","Suhbat","Germaniya","","Telefon","","Asadulloh - Konsultant, Xusanxon - Konsultant","asakali payshanb kuni keladi germaniya til kursi  kelmadi vaqt topib keladi 43 yosh 6-yanvar keladi ","",0,0,0,0,0,0,0,"","",""],["NO-315","Muhammadyusuf","+998970671771","Suhbat","Germaniya","","Instagram","","Xusanxon - Konsultant","Germaniya til kursi  Pravaga o’qiyapti, Ertaga keladi. Avstraliya va Canada’ga taklif ciqssa aytilsi","",0,0,0,0,0,0,0,"","",""],["NO-318","Shuxratbek","+998930698029","Suhbat","Aniq emas","","Telefon","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","23 yosh Andijonli bc prava bor   polsha yokida 2000 2500 oylikga ish kk hec qanday til bimaydi dusha","",0,0,0,0,0,0,0,"","","941042191"],["NO-323","Arziqulov Nodir aka","+998 90 622 1414","Suhbat","Bolgariya","","Sarafan","","Asadulloh - Konsultant","Rus tili yaxshimas, suhbattan o’taolmadi 2- Dushanba keladi, shartnoma qiladi. 3-  Ish beuchu tel qi","",0,0,0,0,0,0,0,"","","@Najod_ilmda"],["NO-326","Muhammad Yusuf","+998930035787","Suhbat","Turkiya","","Sarafan","","Xusanxon - Konsultant","Germaniya work and trevel  tgdan yozildi","",0,0,0,0,0,0,0,"","","@nematov_my"],["NO-327","Murodil Numonov","+998994328205","Suhbat","Turkiya","","Telefon","","Xusanxon - Konsultant","Elektrik, Bolgariya va Turkiyta. Serbiya bo’lishi mumkin ochirilgan telefon qilib aytildi mono  mark","",0,0,0,0,0,0,0,"","",""],["NO-334","Ilhom aka","+998916196119","Suhbat","Bolgariya","","Sarafan","","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","Dushanba keldi yengil ish kerak  payshanba kunga ochirilgan jumagaca  Ozi keladi 5-duyshanba keladig","",0,0,0,0,0,0,0,"","",""],["NO-335","Farxodjon","+998938075807","Suhbat","Arab","","Sarafan","","Asadulloh - Konsultant","Saudiyaga Oqish  IT sector tgdan malumot tashlansin dushanba keldi","",0,0,0,0,0,0,0,"","","938075807"],["NO-336","Umidjon Ergashev","+998934421179","Suhbat","Germaniya","","Sarafan","","Xusanxon - Konsultant","germaniya til kursi 46 yosh rus tilini biladi Payshanba  Sarvar aka bn  gaplashadi ochirilgan","",0,0,0,0,0,0,0,"","",""],["NO-349","Xujanov Otabek","+998999597502","Onlayn Suhbat","Polsha","","Onlayn Ariza","","Xusanxon - Konsultant","Kotarmadi Surxondaryo  sloveniyaga qiziqgan serbiya haqida malumot berildi telegram link berildi ozi","",0,0,0,0,0,0,0,"","","998975354502"],["NO-467","Shahobiddinov  Habibulloh","+998998702113","Suhbat","Aniq emas","","Sarafan","","Xusanxon - Konsultant","rus tili 100% ingliz tili b1 darajada  qurilish beton 25 Polshaga qiziqyapti, Angliyaga ketib turadi","",0,0,0,0,0,0,0,"","",""],["NO-482","Rahmonov Xafizulloh","+998916155953","Suhbat","Turkiya","","Onlayn Ariza","Erkak","Muhammad Rizo - Sotuv Menejeri","Daniya kotarmadi sewanba keladi  3-keldi turkiya qizidi 4-turkiyaga turklar bilan suhpat qigan jovop","",0,0,0,0,0,0,0,"","","@Xafizulloh_05"],["NO-498","Bahodiriy Muhammad Sulton","+998 97 001 4411","Suhbat","Daniya","","Telegram","","Asadulloh - Konsultant","24 y, Daniyaga. Ingliz tili yaxshi Seshanba keladi. o’qish yoki ish o’ylanib turipti","",0,0,0,0,0,0,0,"","",""],["NO-501","Turgunov Jasurbek","+998944360377","Onlayn Suhbat","Bolgariya","","Onlayn Ariza","","Xusanxon - Konsultant","Andijon  jumadan keyin juma soat 10:00ga 30 yosh rus ingliz tilini biladi face 35 balgariya yozgi ma","",0,0,0,0,0,0,0,"","","Turgunovjasurbek"],["NO-563","Shokirov Rozimuhammad","+998 93 204 0003","Suhbat","Germaniya, Montenegro","","Sarafan","Erkak","Xusanxon - Konsultant","O’ylab aytadi yevropaga, yaxshi tolaydigan joy kerak diyapti korea magistraturaga harakat qlyapdi ge","",0,0,0,0,0,0,0,"","",""],["NO-574","Abdulloh","90 406 86 46","Onlayn Suhbat","Aniq emas","","Onlayn Ariza","","Asrorbek - Sotuv/Hujjat Menejeri","1-kotarmadi serbiyadan kelgan  lakatsa tashlansn keladi","",0,0,0,0,0,0,0,"","",""],["NO-601","Abduhokim","+998993719890","Suhbat","Bolgariya, Germaniya, Serbiya","","Onlayn Ariza","","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","keyingi hafta seshanba kuni keladi 2-dekabr 2-kotarmadi Dushanba keladi oshnasi bn  serbiya qurilish","",0,0,0,0,0,0,0,"","",""],["NO-605","Alimov Usmonjon","+998888373717","Suhbat","Polsha","","Onlayn Ariza","","Xusanxon - Konsultant","Polsha 52- yosh rus tilini biladi  Dushanba kuni abeddan keyin keladi soat 6ga keladi  oylab koradi","",0,0,0,0,0,0,0,"","","+998888373717"],["NO-606","Abduquddus","+998978781888","Suhbat","","","Telefon","","Asrorbek - Sotuv/Hujjat Menejeri","1-2 kunda keladi 24 yosh ingliz tilini biladi payshanba keladi xusanxon bn suxbat  chorsanba keladi ","",0,0,0,0,0,0,0,"","",""],["NO-643","Iqboljon","+998 91 806 0044","Suhbat","Serbiya","","Target","","Asadulloh - Konsultant","Jumadan keyin keladi germaniyaga qiziqyapdi Rossiya qurilish, keyin Bolgariyaga 4-xizmat korsatish t","",0,0,0,0,0,0,0,"","",""],["NO-646","Abdulxamid Sotiboldiyev","+998902545545","Suhbat","Serbiya","","Telefon","","Xusanxon - Konsultant","Eski shaxarlik kotarmadi 2 oyda ishlari kopayib ketibdi","",0,0,0,0,0,0,0,"","",""],["NO-686","Boburjon mamatov","+998911151951","Suhbat","Rossiya","","Target","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","42 yosh rus tili dushanba keladi fargona telefoni uyda ekan teli uyda ozi kochada Seshanba keladi ke","",0,0,0,0,0,0,0,"","",""],["NO-688","Halimaxon Sohibjonova","+998916201077","Suhbat","Bolgariya","","","Ayol","","rossiyadagi ishlar aytildi jasur kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-719","Ilyosbek","+998943888848","Suhbat","","","Target","","Asrorbek - Sotuv/Hujjat Menejeri","Sarvar akaga salom aytdi, Keldi - BC bor, Qurilish. Litva","",0,0,0,0,0,0,0,"","",""],["NO-758","Mominov Isroiljon","+998910606958","Suhbat","Serbiya","","Sarafan","","Xusanxon - Konsultant","seshanba kafel gipsakarton addelka yevra remont dushanba habar olinsn sherigi bor ekan zagram yoq ek","",0,0,0,0,0,0,0,"","",""],["NO-760","Jurabek hakimov","+998907690543","Suhbat","Turkiya","","Sarafan","","Asadulloh - Konsultant","nosir aka tanishi turkiya keyin polsha 57 yosh Qaysi ish vakansiyasiga tushishi mumkin","",0,0,0,0,0,0,0,"","",""],["NO-780","МухаммадАли Илхомов","+998937552085","Onlayn Suhbat","Bolgariya","","Bot orqali","","Xusanxon - Konsultant","Bolgaria kotarmadi","",0,0,0,0,0,0,0,"","","@alikhan_osmanzade"],["NO-799","Boburmirzo","+998954540057","Suhbat","Serbiya","","Target","Erkak","Muhammad Rizo - Sotuv Menejeri","1. payshanba kuni keladi  2. abetan keyin keladi   3. kotarmadi  4. kotarmadi  5. seshanba keladi 6 ","sohasi adelka kafelchi ekan",0,0,0,0,0,0,0,"","",""],["NO-813","Furqatjon xusanov","933559485","Onlayn Suhbat","Serbiya","","Bot orqali","","Xusanxon - Konsultant","fargona  turkiya boyicha malumot berildi hozir toshkendda","",0,0,0,0,0,0,0,"","",""],["NO-823","Imomberdi","951000699","Onlayn Suhbat","Serbiya","","Target","","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","Namanganlik kechro tgdan online suhbat qilinsin online suxbat boldi oylab koradi","",0,0,0,0,0,0,0,"","",""],["NO-839","Obid","+998996195887","Onlayn Suhbat","Bolgariya","","Telefon","Erkak","Xusanxon - Konsultant","furaga sirdaryo  chip karta va ADR karta tayyorlab turadi yangi yildan keyin gaplashiladi. kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-862","Сардор","+998938192191","Onlayn Suhbat","","","Target","","Asrorbek - Sotuv/Hujjat Menejeri","online suhbat qilinadi qoraqalpoq  onasi bn maslaxatlashadi","",0,0,0,0,0,0,0,"","",""],["NO-866","Avazbek","+998550225752","Suhbat","Serbiya","","Telegram","","Xusanxon - Konsultant","kutdm aloqaga chiqmadi kirdi shanba keladi Antalya suxbatga kirgan","",0,0,0,0,0,0,0,"","","+998916146090"],["NO-867","Muhammadamin Inoyatov","+998901605549","Suhbat","Daniya","","Telefon","","Xusanxon - Konsultant","Daniyaga sherigi bilan IELTS 8 1-kotarmadi logistikada ishlayapdi suxbatga kelgan daniya qmmatliqldi","",0,0,0,0,0,0,0,"","",""],["NO-868","Azizbek Azimjonov","+998941425451","Suhbat","Daniya","","Telefon","","Xusanxon - Konsultant","IELTS 6 Paxtachilik  sherigi bn maslahat qiladi qaytarib yuboradi kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-874","Mirkomil","+998 99 058 5650","Onlayn Suhbat","Serbiya","","Target","","Xusanxon - Konsultant","Samarqandan,  Gisht teruvchi shartnoma qilish kk 1-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-919","Abdurahmon Isaqov","+998 90 143 63 64","Suhbat","Turkiya","","Telegram","","Asadulloh - Konsultant, Xusanxon - Konsultant","Klaradan kelyapdi abduvahob aka tanishi. Til kursiga dushanba topshiradi.  ochirilgan Keldi - Turkiy","",0,0,0,0,0,0,0,"","",""],["NO-923","bunyod","+998 93 001 5008","Onlayn Suhbat","Turkiya","","Telefon","","Sarvarbek - Sotuv Menejeri","hozirga online suxbat  tgdan yozildi  2ta dosti 1ta akasi bor ekan gaplashib turib keladi","",0,0,0,0,0,0,0,"","",""],["NO-936","Дилшод","99 859 23 80","Onlayn Suhbat","Serbiya","","Target","","Sarvarbek - Sotuv Menejeri","kotarmadi  45 yosh","",0,0,0,0,0,0,0,"","",""],["NO-945","Абдигопир","99894 3896611","Suhbat","Bolgariya","","Target","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","1 2 kunda keladi ozi aloqaga chiqib  litvaga topshirib qoygan 2-yanvar aloqaga chiqad","",0,0,0,0,0,0,0,"","",""],["NO-954","Otabek","998074331","Onlayn Suhbat","","","Target","","Sarvarbek - Sotuv Menejeri","2 3 kunda keladi namanganlik namanganlik online suxbatga ofisga kelib ketishi qiyinroq ekan","",0,0,0,0,0,0,0,"","",""],["NO-977","Rustambek К.F. 🇹🇷","+998 93 409 8682","Suhbat","Bolgariya","","Telegram","","Xusanxon - Konsultant","факат обеддан кейин гаплашек seshanba chorshanba kelishi mumkin sarvar aka tanishi abetdan keyinga h","",0,0,0,0,0,0,0,"","",""],["NO-988","Sobirjon","937773155","Onlayn Suhbat","","","Telefon","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","24yosh, Samarkand qzla berdi no erdi kotarmadi oylab koradi  antalyaga shartnoma qilishi kk asadullo","",0,0,0,0,0,0,0,"","",""],["NO-994","Shoxruhbek Togasiga ish kere Mashrap akaga","+998999009230","Suhbat","","","Telefon","Erkak","Muhammad Rizo - Sotuv Menejeri","Qildi, qaytarsam ko'tarmadi qaytardi  2-xayitga keyin keladi| 3-kotarmadi 4-shanba bugun keladi abed","Mashrap aka Shoxruhbekti oshnasixam bolish kere ke",0,0,0,0,0,0,0,"","",""],["NO-1011","Ollomurodjon","+998936405490","Onlayn Suhbat","","","Target","","Sarvarbek - Sotuv Menejeri","rossiyaga boyoq omboriga malumot berish kerak  tgdan yozildi  telefonda malumot berildi","",0,0,0,0,0,0,0,"","",""],["NO-1118","Bekzod Nosirov","+998 94 360 7080","Suhbat","Serbiya","","Target","","Asadulloh - Konsultant","1-Jumadan keyin 2- 4 vakansiyaga ham usta Rus yaxshi. 3-bugun yoki shamba keladi  4-kotarmadi  5-suh","",0,0,0,0,0,0,0,"","",""],["NO-1124","Elomon Komilov /Komilov Rustam","+998975832926","Suhbat","Germaniya","","Sarafan","","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","nemis tili organyapdi ekan boglanib bolmadi 3-shanba kelishadi 4-bloklap qoygan ekan 5-akami oldga b","",0,0,0,0,0,0,0,"","",""],["NO-1172","Abduhalim Abduvahobov","+998942507779","Suhbat","Germaniya, Polsha","","Telefon","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","dushanba keladi aniq  Injiner mexanik Germaniya til kursi germaniyadagi tanishi bilan gaplashib kora","",0,0,0,0,0,0,0,"","","Abduvahobov_A_A"],["NO-1179","Tursunboy Roʻziyev","+9980029480 +998880089480","Suhbat","Daniya","","Target","","Xusanxon - Konsultant","Dushanba abetdan keyin keladi ayoli keldi germaniya va balgariya tavsiya qilindi qizi ham yevropada ","",0,0,0,0,0,0,0,"","",""],["NO-1193","Фаррухбек","+998979354000","Onlayn Suhbat","Bolgariya","","Bot orqali","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","Aндижонданман  menga shengendan taklifnoma bosa boldi chiqarib bersela rozi qilaman ish topib bermas","",0,0,0,0,0,0,0,"","","+998979354000"],["NO-1201","Бехруз","90 560-44-22","Onlayn Suhbat","","","Target","","Sarvarbek - Sotuv Menejeri","ozi aoqaga chiqadi  dushanba  online suxbatga","",0,0,0,0,0,0,0,"","",""],["NO-1205","chortoq","+998934031713","Onlayn Suhbat","","","Target","","Sarvarbek - Sotuv Menejeri","ozi aloqaga chiqadi  dushanba","",0,0,0,0,0,0,0,"","",""],["NO-1214","yolchiboy qayumov","500062472","Suhbat","Bolgariya","","Bot orqali","","Asrorbek - Sotuv/Hujjat Menejeri, Muhammadayub - Call Center, Xusanxon - Konsultant","dushanba yoki seshanba 2 payshanba keladi  2-kotarmadi 3-abegacha keladi 4-payshanba tel qilish kere","",0,0,0,0,0,0,0,"","",""],["NO-1234","Elmurod","+998995373811","Suhbat","Bolgariya, Germaniya","","Target","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","dushanba keladi  abetgacha keladi  Keldi, Bolgariya va Germaniya til kursiga ketmoqchi. Chorshanba a","",0,0,0,0,0,0,0,"","",""],["NO-1254","Shuhratbek","998051744","Suhbat","","","Target","","Sarvarbek - Sotuv Menejeri","yangi haftaga keladi  seshanba keladi aniq kelyapti","",0,0,0,0,0,0,0,"","",""],["NO-1259","Nurmuxammad","94 266 1113","Suhbat","","","Target","","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","bosh vaqt topib keladi Payshanba javobini aytadi","",0,0,0,0,0,0,0,"","",""],["NO-1288","sherzod","90 171 74 07","Suhbat","","","Target","","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","1-seshanba keladi 2-1-2 soatda keladi 3-kotarmadi 4-yangi yildan keyin aloqaga chiqilsin 5 etaga bor","",0,0,0,0,0,0,0,"","",""],["NO-1297","Abdulbosit","+998939691119","Suhbat","Polsha","","Target","","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","1-seshanba keladi 2-germaniya til kursi 3-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-4201","Xolboyeva Rano","947740987","CV Topshirildi","Turkiya","","Telegram","","Xusanxon - Konsultant","","",0,0,0,0,0,0,0,"","",""],["NO-4204","DAVRONOV ZOKIRJON","903901426","Viza Oldi","Turkiya","","Telegram","","Xusanxon - Konsultant","","",1,0,0,1,0,0,0,"","",""],["NO-4864","Joraboev Muhammadmuso","+998 90 526 06 07","Ishga qabul qilindi","Bolgariya","","Sarafan","Erkak","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","","",0,0,0,0,0,0,0,"","",""],["NO-5056","Komiljonov omadjon","+939963883","Shartnoma qildi","Polsha","","Sarafan","Erkak","Asadulloh - Konsultant","","",0,0,0,0,0,0,0,"","",""],["NO-5058","Inomjonov ikromjon","903837380","Shartnoma qildi","Polsha","","Sarafan","Erkak","Asadulloh - Konsultant","","",0,0,0,0,0,0,0,"","",""],["NO-5082","Azizboev Muxammadshoyatillo","+998889953636","Shartnoma qildi","Bolgariya","","Sarafan","Erkak","Xusanxon - Konsultant","","",0,0,0,0,0,0,0,"","",""],["NO-5742","Abdulaziz","+998 99 877 62 60","Shartnoma qildi","","","Sarafan","Erkak","","","",0,0,0,0,0,0,0,"","",""],["NO-5834","Dadabayev Samurbek","+998338005005","XBA To'lov qildi","Bolgariya","","Target","Erkak","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","","",0,0,0,1,0,0,0,"","",""],["NO-5873","Gulshoda Muzaffarova","+998935708353","Hujjatlar Jonatildi","Bolgariya","","","Ayol","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","","",1,0,0,1,0,0,0,"","",""],["NO-5901","Abdurasul Dehqonov","+998933484999","XBA To'lov qildi","","","Target","Erkak","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","","",0,0,0,0,0,0,0,"","",""],["NO-5939","Gulnora Kenjaboyeva","+998 94 402 89 98","Hujjatlar Jonatildi","Bolgariya","","Sarafan","Ayol","Xusanxon - Konsultant","","",0,0,0,0,0,0,0,"","",""],["NO-5942","Muhammadqosim Karimjonov","931782672","Shartnoma qildi","Bolgariya","","Telegram","Erkak","Xusanxon - Konsultant","","",0,0,0,0,0,0,0,"","",""],["NO-6363","Odiljon aka","+998334716867","Ishga qabul qilindi","Montenegro","","Olim aka","Erkak","Xusanxon - Konsultant","","",0,0,0,1,0,0,0,"","",""],["NO-6364","Najmiddinov Husanboy","914844246","Ishga qabul qilindi","Montenegro","","Olim aka","Erkak","Xusanxon - Konsultant","","",0,0,0,1,0,0,0,"","",""],["NO-6367","Soimov Elmrod","914777820","Ishga qabul qilindi","Montenegro","","Olim aka","Erkak","Xusanxon - Konsultant","","",0,0,0,1,0,0,0,"","",""],["NO-6396","Hankova Anna","954728008","Shartnoma qildi","Bolgariya","","Telegram","Ayol","Xusanxon - Konsultant","","",0,0,0,0,0,0,0,"","",""],["NO-6523","Alisher Abduraximov","+998 93 225 11 51","Ishga qabul qilindi","Montenegro","","Olim aka","Erkak","Xusanxon - Konsultant","","",0,0,0,1,0,0,0,"","",""],["NO-6556","Umarova Irodaxon","+998914870810","XBA To'lov qildi","Montenegro","","Sarafan","Ayol","Xusanxon - Konsultant","","",0,0,0,0,0,0,0,"","",""],["NO-6569","SALIEV JALOLIDDIN GULOMIDDIN UGLI","+998914904849","Ishga qabul qilindi","Bolgariya","","Sarvar aka hamkor-+998 94 838 72 50","Erkak","Asadulloh - Konsultant, Xusanxon - Konsultant","","",0,0,0,1,0,0,0,"","",""],["NO-6570","TUKHTAEV TOKHIR ABDULLAEVICH","+998907704995","Ishga qabul qilindi","Bolgariya","","Sarvar aka hamkor-+998 94 838 72 50","Erkak","Asadulloh - Konsultant, Xusanxon - Konsultant","","",0,0,0,1,0,0,0,"","",""],["NO-6571","KODIROV RAVSHANBEK ERGASHEVICH","+998910630184","Ishga qabul qilindi","Bolgariya","","Sarvar aka hamkor-+998 94 838 72 50","Erkak","Asadulloh - Konsultant, Xusanxon - Konsultant","","",0,0,0,1,0,0,0,"","",""],["NO-6572","NORBOEV FARKHOD ABDUSAMATOVICH","+998907704995","Ishga qabul qilindi","Bolgariya","","Sarvar aka hamkor-+998 94 838 72 50","Erkak","Asadulloh - Konsultant, Xusanxon - Konsultant","","",0,0,0,1,0,0,0,"","",""],["NO-7202","Davronov Ixtiyor","+998 94 838 72 50","XBA To'lov qildi","Bolgariya","","Sarvar aka hamkor-+998 94 838 72 50","Erkak","Asadulloh - Konsultant, Xusanxon - Konsultant","","",0,0,0,1,0,0,0,"","",""],["NO-3887","Muhammadyunus Mirkomilov","","Shartnoma qildi","Turkiya","","Taqdimot","","Xusanxon - Konsultant","Kok kiyimli aka 1 hafta ichida qiladi","",0,0,0,0,0,0,0,"","",""],["NO-7215","Furqat aka","","Ishga qabul qilindi","Bolgariya","","Oybek +998 95 533 00 70","Erkak","Asadulloh - Konsultant, Xusanxon - Konsultant","","",0,0,0,0,0,0,0,"","",""],["NO-5","Ziynatulloh","+998990606423","Keyinchalik","Aniq emas","","Telefon","","Asadulloh - Konsultant","Germaniya 2- Tusholmadim, Keyin 4da keladi 3- Keldi, Germaniya bo’lmadi. Australia’ga o’qishga ketmo","Germaniyaga Pozitsiya ochilganda bog’lanilsin",0,0,0,0,0,0,0,"","","@Gofur0v"],["NO-12","Shoxrux","+998915154395","Boglanildi","Bolgariya","","Telefon","","Asrorbek - Sotuv/Hujjat Menejeri","Yevropa, Sprinter Bolgariya 2- Sinifdoshini kutyabti  24-oktabr uchub keladi rossiyadan 1 soatlarda ","Telefon qillib bog’lanilsin",0,0,0,0,0,0,0,"","",""],["NO-14","Azizbek","+998941764247","Bekor qildi","","","Telefon","","","Yevropa","",0,0,0,0,0,0,0,"","",""],["NO-16","Sharofiddin","+998999009230","Bekor qildi","Rossiya","","Telefon","","","Koreyaga to'lov qilish uchun kelganda gaplashadi (Sherigi bilan kelgandi argon svarkachi) 2-Rossiyag","",0,0,0,0,0,0,0,"","",""],["NO-17","Shoxislom","+998940082727","Keyinchalik","Aniq emas","","Telefon","","","Bu hafta oxirida keladi. Sarvar aka bilan kelishib olarkan.","",0,0,0,0,0,0,0,"","",""],["NO-18","Jahongir","+998903889911","Keyinchalik","Bolgariya","","Telefon","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","Rossiya oziq-ovqat, 17:00 keyin keladi 10.10 2- Ko’tarmadi (Gribnoy va Qurilish) bugun  ingliz tilin","",0,0,0,0,0,0,0,"","",""],["NO-19","Muzaffar aka","+998975806464","Boglanildi","Serbiya","","Telegram","","Asadulloh - Konsultant","Serbiya kuryer, hozir rosssiyada, telegramdan yoziladi. 2- UZb’ga kelarkan gaplashib olamiz duwanba ","",0,0,0,0,0,0,0,"","",""],["NO-20","Asadbek","+998973279400","Bekor qildi","","","Telefon","","","Koreyaga ketadigan, ketmasa gaplashamiz 2- Boshqa firma bilan kelishuv qildi.","",0,0,0,0,0,0,0,"","",""],["NO-23","G'ayratbek","+998944055004","Bekor qildi","Germaniya","","Telefon","","","Germaniyaga til kursi taklif etildi, toshkenttan 2 - 1 soatlarda qiladi 3- Ko’tarmadi, O’zi telefon ","",0,0,0,0,0,0,0,"","",""],["NO-27","Abduxoshim Xoliqov","+998947210800","Boglanildi","Aniq emas","","Telegram","","Sarvarbek - Sotuv Menejeri","Ausbildunga topshiribti 2000 euroga, yanvarda telefon qil 2-boshqa yonalish","Fevralda tel qil",0,0,0,0,0,0,0,"","","@La_ilaha_ill_Alloh"],["NO-31","Shoirbek Nurmamatov","+998889974585","Anchagacha Kotarmadi","Bolgariya","","Telegram","","Asadulloh - Konsultant","25 yosh, Scarshik, BC bor, 14 kelishi kerak 2- ko’tarmad 3- ozi qaytaradi Chorshanba keladi 4- ko’ta","",0,0,0,0,0,0,0,"","","@Shoirbek_09"],["NO-33","Shokir","+998971947575","Bekor qildi","","","Telefon","","","29 yosh, Surxondaryolik 2-tusholmadim  3-tuwolmdik vulkanizatsiya ketibdi","",0,0,0,0,0,0,0,"","",""],["NO-34","Azizbek","+998941764247","Keyinchalik","Rossiya","","Telefon","","Xusanxon - Konsultant","26 yosh, Namanganlik 2- Rossiya uchun o’zi tel qiladi/ pul kelishini kutyabti 3- Pul yo’q ekan","",0,0,0,0,0,0,0,"","",""],["NO-35","Rahmatulloh","+998973395111","Keyinchalik","Bolgariya","","Telefon","","Sarvarbek - Sotuv Menejeri","Bolgariya 2- Seshanba Qlishi kerak, 3 oylik  so’radi 3- ko’tarmadi gaplawildi tg orqali toxtab turam","",0,0,0,0,0,0,0,"","",""],["NO-36","Davron","+998958500216","Bekor qildi","","","Telefon","","","Yevropa 2- Slovenia 3- Dadasi unamadi","",0,0,0,0,0,0,0,"","",""],["NO-689","Abdusamad","+998901460203","Bekor qildi","Germaniya","","Target","","","Germaniya Xorvatiya Yengil ish kerak","",0,0,0,0,0,0,0,"","",""],["NO-38","Sardorjon","+998997841305","Boglanildi","Litva","","Sarafan","","Sarvarbek - Sotuv Menejeri","Litva ketishi mumkin, Rossiyadan keladi Keldi, cho’zib yuribti kotarmadi  raqam notogri  boglanib bo","",0,0,0,0,0,0,0,"","",""],["NO-40","Ulugbek","+998336401276","Bekor qildi","Aniq emas","","Telegram","","Asadulloh - Konsultant","Yevropa, 50 yosh, 20 oktabr keladi faqat tg notogri raqam","",0,0,0,0,0,0,0,"","",""],["NO-41","Navroz","+79891056747","Keyinchalik","Rossiya","","Telegram","","Asadulloh - Konsultant","Oyning oxirida Rossiya uchun telefon qiladi. 1- O’zbekistonga keladi, yangi yilan keyin","",0,0,0,0,0,0,0,"","",""],["NO-42","Jasurbek","+998940570069","Bekor qildi","Rossiya","","Telegram","","","Gribnoyga o'ylab turibti, Rossiya 1- puldan muammo bo’lyapti, bo’shab o’zi o’tarkan. bloklangan nome","",0,0,0,0,0,0,0,"","",""],["NO-43","R.B.Buronova","+998887950808","Boglanildi","Bolgariya","","Telegram","","Asadulloh - Konsultant","Otkaz yegan, Bolgariyaga. Germaniyaga Ketadi 2- O’g’li kelib ketti 3- Passport almashtirish shartmas","",0,0,0,0,0,0,0,"","",""],["NO-46","Shoyatillo","+998889953636","Anchagacha Kotarmadi","Aniq emas","","Telegram","","Xusanxon - Konsultant","Yevropaga, anchadan beri kelmay yuribti 2- Ko’tarmadi, Telegramdan yozdim, ishi tugashi bilan kelar ","",0,0,0,0,0,0,0,"","",""],["NO-47","Doniyor aka","+998902687008","Keyinchalik","Litva","","Telegram","","Asadulloh - Konsultant","Litva 2- Oshnalari 5mln baribir o’zida qolarkanda diyishyapti   3-hozir emas ishlarim bor ozim aytam","",0,0,0,0,0,0,0,"","",""],["NO-50","Abdurahmon Sobirov","+998947852303","Bekor qildi","Bolgariya","","Sarafan","","Asadulloh - Konsultant","Bolgariya uchun shartnoma qildi, 25-oktabrgacha tolamay turadiacha","",0,0,0,0,0,0,0,"","",""],["NO-52","Hudoberdi","+998954770400","Anchagacha Kotarmadi","Bolgariya","","Sarafan","","","Tolov qilmadi","",0,0,0,0,0,0,0,"","",""],["NO-53","Abduhalim aka","+998996325733","Bekor qildi","Aniq emas","","Telefon","","","Jumadan keyin keladi ugli bilan 2- ko’tarmadi 3- ko’tarmadi 4-ocirilgan 5-kotarmadi korea oqish boyi","",0,0,0,0,0,0,0,"","",""],["NO-55","Nurmuhammad Abdurahmonov","+998999004808","Boglanildi","Aniq emas","","Telegram","","Asadulloh - Konsultant","Ertaga keladi, Lekin Namanganda ekan Dushanba keladi 1-kotarmadi 2-ochrilgan  3-ochrilgan \\","Agar kelolmasa onlayn vidyoda gaplashib  onlayn sh",0,0,0,0,0,0,0,"","","+998943031489"],["NO-57","Avazbek","+998905257232","Bekor qildi","Litva","","Yarmarka","","","Litva, plitka kafel 1- Ertaga abetta telefon qiladi, lakatsiya tashlandi.  2- Ko’tarmadi  ertaga kel","",0,0,0,0,0,0,0,"","","+998905257232"],["NO-59","Boymurod","+998501111747","Boglanildi","Serbiya","","Yarmarka","","Xusanxon - Konsultant","Bolgariya Qurilish. ozi telefon qiladi ozini qurilish abayekti bor ekan undan keyin boglanar ekan  b","",0,0,0,0,0,0,0,"","",""],["NO-60","O'tkirbek","+998978332685","Bekor qildi","","","Yarmarka","","","Eshik rom ustasi 7+yil ishlash chiqarish  1- ko’tarmadi 2- ko’tarmadi 3-kotarmadi + kotarmadi 4","",0,0,0,0,0,0,0,"","",""],["NO-61","Elamon","+998934988436","Boglanildi","Bolgariya","","Yarmarka","","Asadulloh - Konsultant","BC, Elektrik, Kladchik 1- Ko’tarmadi 2- 3,4 kunda bo’shab o’tadi, telegramdan lakatsiya tashlandi. q","",0,0,0,0,0,0,0,"","",""],["NO-62","Abdusamad","+998970428287","Anchagacha Kotarmadi","Bolgariya","","Yarmarka","","Asadulloh - Konsultant","Bolgariya, Qurilish. abetdan keyin keladi  2- Keldi Shartnoma qilib ketti 3- Ko’tarmadi 4- Seshanbal","",0,0,0,0,0,0,0,"","",""],["NO-63","Bobur","+998951686191","Boglanildi","Bolgariya","","Yarmarka","","Muhammad Rizo - Sotuv Menejeri","Er xotin zavod 1- Bugun erta keladi, telegramdan lokatsiya tashlandi. 2- Bugun kechgacha keladi. 3-k","",0,0,0,0,0,0,0,"","",""],["NO-66","Azamat","+998934573197","Keyinchalik","Germaniya","","Yarmarka","","","Germaniya B1 bor, Göete.  elektr diplomi bor . telegramdn lakatsiya tashaldi. abetdan keyin keladi  ","",0,0,0,0,0,0,0,"","",""],["NO-68","Ulugʻbek","+998948220225","Boglanildi","Bolgariya","","Yarmarka","","Asrorbek - Sotuv/Hujjat Menejeri","1. Mebel va Qurilish. kotarmadi kotarmadi 21.10 2. pul muammo elektriklikga ham qiziqdi  3. kotarmad","",0,0,0,0,0,0,0,"","","@Ghyssgk"],["NO-71","Shuxrat","+998998303766","Keyinchalik","Aniq emas","","Sarafan","","","Yoshi 59 yengil ish va ferma Dushanba keladi","",0,0,0,0,0,0,0,"","",""],["NO-74","Otabek","+998883467671","Bekor qildi","Germaniya","","Telegram","","Asrorbek - Sotuv/Hujjat Menejeri","Germaniyaga oʻgʻli uchun doktorlikka soʻradi. Oʻgʻli telegramdan bogʻlanadi. ertaga tel qilinsin 2- ","",0,0,0,0,0,0,0,"","",""],["NO-76","Lutfulloh","+998944468584","Boglanildi","Bolgariya","","Telegram","","Asadulloh - Konsultant","Rossiya qoʻziqorin, tg'dan yozsa raduga vidyosi tashlab berildi ogillari bn gaplawib yana telefon qi","",0,0,0,0,0,0,0,"","",""],["NO-82","Xakimov olimjon","nomeri yoq","Boglanildi","Aniq emas","","Telegram","","Sarvarbek - Sotuv Menejeri","40 45 yosh atrofidagi ayolga tozolovchilikga til bilmaydi   nomeri yoq","",0,0,0,0,0,0,0,"","",""],["NO-84","Iqboljon","+998940433343","Boglanildi","Aniq emas","","Telefon","","Sarvarbek - Sotuv Menejeri","1-Ingliz/rus tili biladi. Kafel va qurilish. 5-kuni kelyapdi   2-Bloklangan 3-tarmoqda mavjud emas","",0,0,0,0,0,0,0,"","",""],["NO-85","Samarqand","+998883981082","Boglanildi","Bolgariya","","Telefon","","Sarvarbek - Sotuv Menejeri","Samarqand, rus tilini biladi. Qurilishga. Tg'dam ma'lumot tashlash kerak 27.10 kotarmadi  oylab kori","",0,0,0,0,0,0,0,"","",""],["NO-86","Sarafroz","+998916118821","Boglanildi","Arab","","Sarafan","","Xusanxon - Konsultant","Arabga ketishi mumkin, til o'rganib hasanboy akani tanishi. 15-Dekabrgacha Hasanboy akadan javobini ","",0,0,0,0,0,0,0,"","",""],["NO-87","Sanjarbek","+998930913075","Keyinchalik","Turkiya","","Telegram","","","Turkiya banan, Seshanba keladi. Telegramdan lakatsiya tashaldi 2- BAA va Qatar, uydegilar bilan gapl","",0,0,0,0,0,0,0,"","","93 091 30 75"],["NO-89","Baxromjon","+998975740081","Boglanildi","Germaniya","","Telefon","","Sarvarbek - Sotuv Menejeri","Germaniyaga qizini joʻnatmoqchi. Til kursiga. Namanganlik, kelib ketadi ofisga 2- ko’tartdi aloqa ya","",0,0,0,0,0,0,0,"","","+998975740081"],["NO-90","Mavlonbek","+998911694540","Boglanildi","Serbiya","","Sarafan","","Asrorbek - Sotuv/Hujjat Menejeri","1. BC bor, Moshina Bozor Shafyor. 2. ishlari bor ekan  3. Kotarmadi 4. Shanba 5. kotarmadi  6. opoda","",0,0,0,0,0,0,0,"","",""],["NO-91","Ravshanbek","+998999067936","Bekor qildi","Bolgariya","","Sarafan","","","27.10 keldi balgariya boyicha prezentatsiya berildi uydagilari bn maslahatlawib anigini aytib yubora","",0,0,0,0,0,0,0,"","",""],["NO-93","Javohir","+998946216232","Bekor qildi","Germaniya","","Telefon","","","Germaniya til kursiga,","Shartnomas Tg’dan tashlansin Munich’dagi til kursi",0,0,0,0,0,0,0,"","",""],["NO-96","Abdulloh","+998903844237","Bekor qildi","Rossiya","","Telegram","","Asadulloh - Konsultant","turkiyaga qiziqyapdi ertaga telefon qilinsin telegramdan yozildi","",0,0,0,0,0,0,0,"","","@abdulloxzz"],["NO-97","Izzatillo","+998902567636","Bekor qildi","Aniq emas","","Instagram","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","bc categoriyada prava bor paxtaobodli ingliz rus tillarini biladi  Dadasi bn maslahat qilib tel qila","",0,0,0,0,0,0,0,"","",""],["NO-99","Begali","+998971697771","Boglanildi","Aniq emas","","Telefon","","Xusanxon - Konsultant","ertaga keladi 28.10 kotarmadi  Juma 9:30 tel qilinsin polsha jumadan keyin keladi dushanba keladi  s","",0,0,0,0,0,0,0,"","",""],["NO-101","*","+998930352132","Boglanildi","","","Telefon","","Asadulloh - Konsultant","telefon qildi ozi lekin kotarmayapdi 2- Ko’tarmadi 3-ochrilgan","",0,0,0,0,0,0,0,"","",""],["NO-102","Muzaffar","+998885119878","Keyinchalik","Germaniya","","Telefon","","Sarvarbek - Sotuv Menejeri","ingliz rus 27 yow xorazimlik abetdan keyin tg orqali gaplashamiz Koreyaga o’zgaarib ketishi mumkin, ","",0,0,0,0,0,0,0,"","",""],["NO-103","javohir","+998993445778","Bekor qildi","","","Telefon","","Asrorbek - Sotuv/Hujjat Menejeri","rus tili bc ozi tel qladi . Bomaydigan boldi","",0,0,0,0,0,0,0,"","",""],["NO-104","Umrzaqov Sardorjon","+998931226688","Boglanildi","Koreya","","Telefon","","Sarvarbek - Sotuv Menejeri","ochi chiqyapdi ertaga telefon qilinsin 2- ko’tarmadi. 3-kotarmadi   koreya telefon egasida emas ozi ","",0,0,0,0,0,0,0,"","",""],["NO-105","oybek","+998917172803","Boglanildi","","","Telefon","","Sarvarbek - Sotuv Menejeri","kotarmayapdi  pravaga oqiyapdi surxandaryodan 2 oyda e categoriyadagi pravani oladi  2-kotarmadi  3-","",0,0,0,0,0,0,0,"","",""],["NO-107","g’olibjon","+998930352132","Boglanildi","Aniq emas","","Telefon","","Muhammad Rizo - Sotuv Menejeri, Sarvarbek - Sotuv Menejeri","namanganlik sheriklari bn maslahatlashib koraman diyapdi koreada tanishi bor ekan rus tilini bilar e","",0,0,0,0,0,0,0,"","",""],["NO-108","Otajonov","+998997549705","Keyinchalik","","","Telefon","","Xusanxon - Konsultant","Xorazm . ingliz tili va rus tilini biladi qurilishda ishlamedi Boshqa yonalish javob beryapti  jumma","",0,0,0,0,0,0,0,"","",""],["NO-109","Oybek","+998943359197","Boglanildi","Bolgariya","","Telefon","","Asrorbek - Sotuv/Hujjat Menejeri","1.  23 ingliz rus tili samarqand  2. oylab koradi 3. kotarmadi 4. kotarib ochrib qoydi 5. oylab kora","",0,0,0,0,0,0,0,"","",""],["NO-113","Ohun","+998933028830","Boglanildi","Turkiya","","Telefon","","Sarvarbek - Sotuv Menejeri","1-otasi bn maslahat qladi turkiya haqida prezentatsiya berildi hec qanday til bilmaydi 2-kotarmadi 3","",0,0,0,0,0,0,0,"","",""],["NO-114","XojiMuhammad","+998337780094","Bekor qildi","Germaniya","","Telefon","","Xusanxon - Konsultant","germaniyaga qiziqyapdi shanba kuni keladi  bosh bosa otadi abetdan keyin  31 oldin Rossiyaga borgan ","",0,0,0,0,0,0,0,"","",""],["NO-116","Soibjamol Shoxruh","+998933284727","Boglanildi","Germaniya","","Onlayn Ariza","","Sarvarbek - Sotuv Menejeri","18 y, koreys ingliz, 2 kundan keyin germaniya til kursi kasbiy talim qizlaga nomeri berildi","",0,0,0,0,0,0,0,"","","@shox_kr07"],["NO-117","Nazirjon Mansurov","+998331897128","Bekor qildi","Bolgariya","","Onlayn Ariza","","Xusanxon - Konsultant","Andijon  Paxtaobod 54 yosh rus tilini biladi chorshanba keladi 4.11.2025 qurilish abekti tugagandan ","",0,0,0,0,0,0,0,"","","+tel:+998996097128"],["NO-118","Sotvoldiyev Mirabdullo","+998958760708","Boglanildi","Serbiya","","Onlayn Ariza","","Xusanxon - Konsultant","rus tili sozlashuv darajasida 1 haftada habar olinsin kotarmadi  ishda oylab aloqaga chiqadi","",0,0,0,0,0,0,0,"","","+998958760708"],["NO-121","Avazbek","+998912052577","Boglanildi","Sloveniya","","Yarmarka","","Xusanxon - Konsultant","qaytarvoradi Sloveniayaga qiziqyapti  rus tili pul muammo kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-123","Azamat","+998973015101","Boglanildi","Bolgariya","","Telefon","","Xusanxon - Konsultant","rus tilini biladi namanganli a ha  ochirilgan  oldi ochrib qoydi","",0,0,0,0,0,0,0,"","",""],["NO-127","Umidbek","+998970950415","Bekor qildi","","","Telefon","","","Turk tilini biladi. Turkiya uchun. 1- kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-128","Mannop","+998955280640","Boglanildi","","","Telefon","","Asadulloh - Konsultant","30 yosh, Samarqand. Rus tili (Suhbattan darajasida) payshanba bog’lanilsin 5larda tel qiladi","",0,0,0,0,0,0,0,"","",""],["NO-129","Adahamjon aka","+998901794393","Boglanildi","","","Telefon","","Asadulloh - Konsultant","32, Quva, Rus tili, Zavodda ish. Dushanba keladi. Ukasi bor Rossiyada, Rus tili yaxshi, povar. kotar","Ukasiga Povarlikka Ish topilsin. Bolgariya Sezinli",0,0,0,0,0,0,0,"","",""],["NO-130","Abdullayev","+998932580144","Bekor qildi","","","Telefon","","","dushanba soat 10:00ga keladi KOREAGA qiziqyapdi erte keladi qizlarga berildi koreaga","",0,0,0,0,0,0,0,"","",""],["NO-131","Muhammadsodiq","+998976120010","Bekor qildi","","","Telefon","","Muhammad Rizo - Sotuv Menejeri","Bolgariyaga qiziqyapti, ishdan keyin qiladi 1- Seshanbalarga keladi vaqt tiopib otadi 2 qilindi 4.5 ","",0,0,0,0,0,0,0,"","",""],["NO-132","Жасурбек","+998934130076","Boglanildi","","","Onlayn Ariza","","Asadulloh - Konsultant","Германия 1- Juma peshindan keyin keladi. tel qilindi narx tog’ri kelmadi kotarmadi","",0,0,0,0,0,0,0,"","","+99883 413 00 76"],["NO-133","Avazbek","+998979975191","Boglanildi","","","Onlayn Ariza","","Asadulloh - Konsultant","Ingliz tili oz biladi, 2-3 oyda o’rganib oladi, 24 y. Keyingi hafta Chorshanba abettan ketin 3 bugun","",0,0,0,0,0,0,0,"","","@Bekbola2001"],["NO-134","Avazbek","+998979975191","Boglanildi","","","Onlayn Ariza","","Xusanxon - Konsultant","tgdan aloqaga chiqadi chorshanba keladi  kotarmadi kotarmadi   kotarmadi","",0,0,0,0,0,0,0,"","","@Bekbola2001"],["NO-135","Zafarbek aka","+998507533371","Bekor qildi","Turkiya","","Telegram","","Muhammad Rizo - Sotuv Menejeri","Turkiya qurilish, Dushanba qilinadi.  1-kotarmadi ukasi tel qladi  3-puli yoq ekan","",0,0,0,0,0,0,0,"","",""],["NO-136","Joʻrayev Muhriddin","+998946944144","Boglanildi","Litva","","Onlayn Ariza","","Xusanxon - Konsultant","Litva tgdan vakansiya tashlandi rus tiini biladi 2-kotarmadi 3-aloqa bolmadi ovozim bormadi unga","",0,0,0,0,0,0,0,"","","Muhriddin"],["NO-140","_","+998997114942","Qilindi","","","Telegram","","Sarvarbek - Sotuv Menejeri","Qaytardik kotarmadi kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-141","Abdurahim Nasirdinov","+998775142696","Bekor qildi","Rossiya","","Onlayn Ariza","","Xusanxon - Konsultant","Bolgariya  52 yosh tezroq chiqib ketishi kerak maslahat qilib tel qiladi","",0,0,0,0,0,0,0,"","","zikrillo"],["NO-142","Abdulaziz Axmadjonov","+998905479727","Boglanildi","Bolgariya","","Onlayn Ariza","","Asadulloh - Konsultant","Andijon kotarmadi doiradan tashqarida","",0,0,0,0,0,0,0,"","","+998905479727"],["NO-145","Qobiljonov Azizbek","+998 95 010 4141","Bekor qildi","","","Onlayn Ariza","","Xusanxon - Konsultant","Olish  soat 2 3 larga keladi 4.11.2025 1-  ko’tarmadi nomer egasi ketgan boshqa odam ishlatyapti","",0,0,0,0,0,0,0,"","","Azizbeko1"],["NO-146","Sunnatillo Xalimov","+998906251604","Boglanildi","","","Onlayn Ariza","","Asadulloh - Konsultant","1- ko’tarmadi. 2-kotarmadi","",0,0,0,0,0,0,0,"","","+998932592004"],["NO-147","Ozodbek","+998771955905","Boglanildi","","","Telefon","","Asadulloh - Konsultant","Qatarga Qoraqalpogʻiston","",0,0,0,0,0,0,0,"","",""],["NO-148","Ibrohimjon Solijonov ( ismi boshqa bolishi mumkin)","+998914931112","Boglanildi","Bolgariya","","Telegram","","Asadulloh - Konsultant","Bc boladi, Dushanba keladi kotarmadi  tgdan aloqaga chiqdik qizillab qoydi kotarmadi 5-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-150","Abdumannob","+998950100033","Bekor qildi","","","Telegram","","Asadulloh - Konsultant","Rus tilini, Turk tili. 35 yosh. Qurilish, kara. Ertaga telefon qiladi 2- Rossiyaga eski turklar chaq","",0,0,0,0,0,0,0,"","",""],["NO-151","Izzatulloh","+998888221300","Anchagacha Kotarmadi","","","Telegram","","Sarvarbek - Sotuv Menejeri","Bolgariya sharbat, Dushanba keladi, Svarka. ertaga keladi toy bolyapdi ekan Dushanba keladi  tgdan b","",0,0,0,0,0,0,0,"","",""],["NO-152","Muhammad Ali","+998997114942","Bekor qildi","","","Telegram","","Xusanxon - Konsultant","Rus tili, Bolgariya. Seshanba keladi  Abetdan keyin keladi Qurulish, Zavod, Qishloqxo’jalik Monolit,","",0,0,0,0,0,0,0,"","",""],["NO-155","Юлдашев Руслан","+998331735696","Boglanildi","","","Onlayn Ariza","","Xusanxon - Konsultant","Туркия tg orqali gaplashildi hafta ohirida shanba kuni kelishi mumkin ertaga imon qilib keladi  … ke","",0,0,0,0,0,0,0,"","","@Jildli"],["NO-157","Алишер мухаммаджонов","+998972857773","Keyinchalik","Turkiya","","Onlayn Ariza","","Xusanxon - Konsultant","Узбекистан Андижан  chorshanba 4.11.2025 turkiya  kotarmadi 2-kotarmadi banan qadoqlash qayta tel qi","Yangi yildan keyinga, zavod yoki banan ishi",0,0,0,0,0,0,0,"","","+998972857773"],["NO-159","Umidjon","+998912906260","Bekor qildi","Rossiya","","Telegram","","Xusanxon - Konsultant","Rus tili, Seshanba keladi  bohorga harakat qiladi. Hozir sovuq diyapti. hafta ohiriga keladi","",0,0,0,0,0,0,0,"","",""],["NO-160","Батиров Асилбек","+998950440388","Boglanildi","Sloveniya","","Onlayn Ariza","","Xusanxon - Konsultant","sloveniya molyar ekan 1500+ oylik kerak oylab korib tel qiladi telefoni chaqirmadi","",0,0,0,0,0,0,0,"","","+998950440388"],["NO-163","Урайимов Умиджон","+998500278117","Bekor qildi","Turkiya","","Onlayn Ariza","","Xusanxon - Konsultant","Туркия  marxamatli yakshanba vaqti bor  kotarmadi kotarmadi ochirilgan ocirilgan","",0,0,0,0,0,0,0,"","","+998932228117"],["NO-166","Azamjon aka","+79783057367","Boglanildi","","","Telegram","","Asadulloh - Konsultant","Imo, Rus tili. Bolgariya. Shartnoma yuborilsa. Vakansiya Tashlansin. borib kelish qoplamedi  dedi","",0,0,0,0,0,0,0,"","",""],["NO-168","Ilhomiddin","+998902549091","Bekor qildi","","","Telegram","","","Puli yoq.","",0,0,0,0,0,0,0,"","",""],["NO-169","Oybek","+998888194343","Boglanildi","Bolgariya","","Telegram","","Xusanxon - Konsultant","Rus tilini, Bolgariya. dushanba tel qilinsin bugun keladi  qaytarib yuboradi bugun keladi","",0,0,0,0,0,0,0,"","",""],["NO-170","Hayotbek","+998955333404","Anchagacha Kotarmadi","Turkiya","","Telegram","","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","Turkiya uchun, Rus tili. Dushanba  keladi ochirilgan seshanba keladi kotarmadi puli yo lekin kutomme","",0,0,0,0,0,0,0,"","",""],["NO-171","Shuhratbek Erquziyev","+998914750580","Bekor qildi","","","Onlayn Ariza","","","Evropa  qaytarib yuboradi 2- ko’tarmadi 3-ochirilgan","",0,0,0,0,0,0,0,"","","998 91 475 05 80"],["NO-172","Habibulloh Qabulov","+998994388252","Boglanildi","","","Telegram","","Muhammad Rizo - Sotuv Menejeri","Habibulloh aka. Stomatologiya. Germaniya, 4-kurs. Yana 1 yil bor 2-aparat ochrilgan","",0,0,0,0,0,0,0,"","",""],["NO-174","Komil aka jizzah","+998953807570","Boglanildi","Serbiya","","Onlayn Ariza","Erkak","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","Maskiva jizzahli tgdan aloqaga chiqildi  2-kotarmadi","TG kanalimiz bor",0,0,0,0,0,0,0,"","","+79163151257"],["NO-175","Umarov Muzaffar","+998932440001","Boglanildi","","","Onlayn Ariza","","Asadulloh - Konsultant","Bulgaria  qaytarib yuboradi 2- ko’tarmadi 3-kotarmadi","",0,0,0,0,0,0,0,"","","+998504772652"],["NO-176","Numono'v Abdullajon","+79014047650","Anchagacha Kotarmadi","","","Onlayn Ariza","","Asadulloh - Konsultant","Qurulish","",0,0,0,0,0,0,0,"","","94 097 76 47"],["NO-177","Numono'v Abdullajon","+79014047650","Anchagacha Kotarmadi","","","Onlayn Ariza","","Asadulloh - Konsultant","Sivarchik, Qurilish","",0,0,0,0,0,0,0,"","","94 097 76 47"],["NO-178","Rakhmon","+79248251123","Anchagacha Kotarmadi","Rossiya","","Onlayn Ariza","","Asadulloh - Konsultant","Litva","",0,0,0,0,0,0,0,"","","+79248251123"],["NO-179","Zilola","+998901432820","Anchagacha Kotarmadi","","","Onlayn Ariza","","Xusanxon - Konsultant","Uzbekiston Kotarmadi+ 4- ko’tarmadi 5-kotarmadi","",0,0,0,0,0,0,0,"","","Zilola"],["NO-181","Alijonov Akramjon","+998932202111","Keyinchalik","Sloveniya","","Onlayn Ariza","","Xusanxon - Konsultant","Andijon  qurilish asaka juma sloveniya 10 kunda kelmasa tel qilinsin 02.11.2025 kotarmadi onasini ma","",0,0,0,0,0,0,0,"","","Akramjon"],["NO-183","Karimjon","+998931372287","Boglanildi","","","Telegram","","Muhammad Rizo - Sotuv Menejeri","Bolgariya, rus oz biladi. O'zi keladi. 40 2-aparat ochrilgan","",0,0,0,0,0,0,0,"","",""],["NO-188","Mirshohid","+998957953500","Boglanildi","","","Telegram","","Xusanxon - Konsultant","Qaytardik, kotarmadi. 2- 34 Mirshohid. Telefon qiladi o’zi европа OILAVIY shanba tezro chiketish kk ","",0,0,0,0,0,0,0,"","",""],["NO-189","Umidjon","+998886660307","Bekor qildi","Turkiya","","Telegram","","Xusanxon - Konsultant","Til bilmedi, Payshanba abettan keyin keladi. Qaytaib yuboradi  Kecro tel qladi toy bolyapdi ekan uyi","",0,0,0,0,0,0,0,"","",""],["NO-190","Abdurauf","+998937069663","Anchagacha Kotarmadi","Bolgariya","","Telegram","","Muhammad Rizo - Sotuv Menejeri, Sarvarbek - Sotuv Menejeri","Qurilish, Zavod. Rus tilini. 26. Chorshanba. Abettan oldin. banitsada ekan 10 kundn keyin habar olin","",0,0,0,0,0,0,0,"","",""],["NO-191","Ziyoviddin","+998954613333","Bekor qildi","Bolgariya","","Telegram","","Xusanxon - Konsultant","Rus tili oz bilan. Yo'li tushsa kiradi. Shengen bolsa boldi. shanba keladi hohish qolmapti","",0,0,0,0,0,0,0,"","",""],["NO-193","Azamat","+998903831003","Bekor qildi","Serbiya","","Telegram","","Xusanxon - Konsultant","kelyapti shanba   ko’tarmedi 3.11.2025 Chorshanba keladi 3 larda tg orqali gaplashilyapdi Koreaga ke","",0,0,0,0,0,0,0,"","",""],["NO-194","Ismoilov  Xasanboy","+998948688676","Boglanildi","","","Telegram","","Xusanxon - Konsultant","qorgontepa rus tili 70% ingliz tili 40% bakalavr bor sifat nazoratchisi bolib ishlagan voqt topib ke","",0,0,0,0,0,0,0,"","",""],["NO-195","Sunnatillo","+998906251604","Boglanildi","","","Telegram","","Xusanxon - Konsultant","21 yosh yakshanba keladi kelmadi pul muammo ozi tel qiladi 1-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-196","Ilhom","+998889640717","Boglanildi","","","Telefon","","Xusanxon - Konsultant","boglanildi gaplashgan odam ishda ekan teli uyda 2-ochrilgan 3-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-197","Xamidjon","+998934063100","Bekor qildi","Turkiya","","Telegram","","Asadulloh - Konsultant","ingliz  tilini biladi dushanba keladi kotarmadi 2- Juma telefon qilinsin abetdan keyin keladi kotarm","",0,0,0,0,0,0,0,"","",""],["NO-198","Jasurbek","+998905259791","Boglanildi","Turkiya","","Telegram","","Asadulloh - Konsultant","turkiyaga deport payshaba keladi   tg dan boglanildi soat 3 yarmga 2- tg’dan audiyo boshqa vakansiya","",0,0,0,0,0,0,0,"","",""],["NO-199","_h","+998937069663","Anchagacha Kotarmadi","Bolgariya","","Telegram","","Xusanxon - Konsultant","1-Qaytardik kotarmadi  2-yana kotarmadi 3.11.2025 3-juma kuni keladi 4-Ochirlgan 5-keladi 6-ochirilg","",0,0,0,0,0,0,0,"","",""],["NO-200","Arabboev","+998905363262","Keyinchalik","","","Telegram","","Xusanxon - Konsultant","BCY  kotarmadi 3.11.2025   keyinchalik boglanadi ketish uchun pul yoq","",0,0,0,0,0,0,0,"","",""],["NO-201","Karimov Kamoldin","+998957953500","Boglanildi","","","Telegram","","Xusanxon - Konsultant","Qaytardik kotarmadi 2-kotartmadi tgdan boglandik seshanba abetdan keyin 30 dekabr tel qldm omadi 5 y","",0,0,0,0,0,0,0,"","",""],["NO-203","Ruslan","+998991856060","Boglanildi","Turkiya","","Telegram","","Xusanxon - Konsultant","rus tili sal biladi turkiyaga harakat qilmoqchi shanba keladi toshkentdan  tgdan gaplashilyapdi  Dus","",0,0,0,0,0,0,0,"","","@Olovbilanoynashma"],["NO-204","Olimjon","+998935242180","Boglanildi","","","Telegram","","Xusanxon - Konsultant","3 4 kunda habar olinsin Kotarmadi ozi tel qiladi","",0,0,0,0,0,0,0,"","",""],["NO-205","Abduvahob","+998950010804","Keyinchalik","","","Telegram","","Xusanxon - Konsultant","kecki voht gaplashiladi telda 2.11 payshanba klaradan keladi vaqti bolmapdi boshashi bn keladi bir y","",0,0,0,0,0,0,0,"","",""],["NO-206","Saydillo","+998772590075","Bekor qildi","","","Telegram","","","dushanba keladi sloveniyaga qiziqyapdi  Keldi y kategoriyada prava bor  atkaz","",0,0,0,0,0,0,0,"","",""],["NO-207","Muhammedov","+998933075155","Anchagacha Kotarmadi","","","Telegram","","Xusanxon - Konsultant","tgdan gaplashilyapdi","",0,0,0,0,0,0,0,"","","@muxammedov_m38"],["NO-208","Avazbek","+998914811172","Boglanildi","","","Onlayn Ariza","","Xusanxon - Konsultant","53 yosh yengil ish kerak yevropadan hozir KGZda","",0,0,0,0,0,0,0,"","",""],["NO-209","Qobiljon","+998918792121","Boglanildi","Litva","","Telegram","","Xusanxon - Konsultant","tel qilinsin abetdan keyin prava olib uchredi Chorshanba abettan keyin Juma kuni kelioshi mumkin BC ","",0,0,0,0,0,0,0,"","",""],["NO-210","Ravshanbek","+998912350350","Boglanildi","Bolgariya","","Telegram","","Xusanxon - Konsultant","Bolgariya. O'zi qiladi 53 yosh Andijonli tgdan malumot beriladi keyinroq tel qadi","",0,0,0,0,0,0,0,"","",""],["NO-211","Isroiljon Nabijonov","+998932512262","Boglanildi","Aniq emas","","Onlayn Ariza","","Asadulloh - Konsultant","1-tgdan boglanildi sudlangan 27 yosh fasd food povur 2-kotarmadi 3-kotarmadi","",0,0,0,0,0,0,0,"","","+998932512262"],["NO-212","Shohboz Qutbiddinov","+998911757711","Bekor qildi","Turkiya","","Onlayn Ariza","","Xusanxon - Konsultant","33 yosh elektirik chorshanba abetdan keyin tgdan ish boyicha vakansiyalr tashlandi qaytarib yuboradi","",0,0,0,0,0,0,0,"","","Major"],["NO-214","Najmiddin","930687677","Boglanildi","Serbiya","","Telegram","","Xusanxon - Konsultant","Payshanba keladi. Qurilishdan zerikdi. Rus tili yaxshimas 2- Band tushdi, Dushanba tel qilinsin. Bir","",0,0,0,0,0,0,0,"","",""],["NO-215","Xadija","+998336027574","Boglanildi","","","Telegram","","Asadulloh - Konsultant","Teleggramdan yozildi, tel qilinganda ko’tarmadi<Eri bilan maslaxatlashib aytadi. Ishqwa eri ketadi. ","",0,0,0,0,0,0,0,"","","+998336027574"],["NO-221","Abdullayev Shohjahon","+998 90 202 0581","Boglanildi","Turkiya","","Telegram","","Asadulloh - Konsultant","Rus va Turk biladi, Oshpalik qilgan. Haydovchilikka qiziqyabti payshanba habar olinsin kecki vohit y","",0,0,0,0,0,0,0,"","","@Shoh_02_akaxon"],["NO-222","Rustam","+998 91 1700072","Boglanildi","Bolgariya","","Telegram","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","53, BC, Rus tili. Chorshanba abettan oldin  Toshkentga ketib qolipdi chip kartasi yoq hokimyatda key","",0,0,0,0,0,0,0,"","",""],["NO-223","Latifjonov","+998 99 533 3776","Boglanildi","","","Telegram","","Asadulloh - Konsultant","Tg orqalli aloqaga chiqqan, Bolgariya haqida, xarajatlar haqida ma’lumot berilgan raqm notogri","",0,0,0,0,0,0,0,"","","@Latifjonov_1"],["NO-226","Umidbek aka","+998 97 095 04 15","Bekor qildi","","","Telegram","","Asadulloh - Konsultant","Turkiayga Elektriklikka, shartnoam va CV tashlansin, Qoraqolpag’istondan qoyib  telefonini pochrib q","",0,0,0,0,0,0,0,"","","+998 97 095 04 15"],["NO-229","Muhammadjon","+998937820406","Boglanildi","Serbiya","","Telegram","","Xusanxon - Konsultant","Serbiya molyar, bu hafta keladi. 2 - 1, 2 soatta keladi. kotardi gapirmadi","",0,0,0,0,0,0,0,"","",""],["NO-231","Zafarbek isboskan","+998916162325","Boglanildi","","","Telegram","","Xusanxon - Konsultant","tel qilindi kotarmadi ertaga soat 10ga keladi","",0,0,0,0,0,0,0,"","",""],["NO-233","Omadjon Qodirjonovich","+998 95 255 29 77","Anchagacha Kotarmadi","","","Telegram","","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","Chorshanba. Abettan keyin. BC bor. 15-dan keyin keladi BCD avtobus 3-soat 3.15da tel qilish kere 4-p","",0,0,0,0,0,0,0,"","",""],["NO-238","( _ )Eldor aka tanishi","+998 91 0100103","Bekor qildi","Serbiya","","Telegram","","Muhammad Rizo - Sotuv Menejeri, Xusanxon - Konsultant","Turkiyaga qiziqyapti, Seshanba (4.11.2025) keladi qaytarib yuboradi kotarmadi Arzonroq vakansiya chi","",0,0,0,0,0,0,0,"","",""],["NO-244","Shokirova  Yulduz","+998936939992","Bekor qildi","Turkiya","","Onlayn Ariza","","Asadulloh - Konsultant","Turkiya tgdan boglanildi 1 yarm haftada habar olinsin","",0,0,0,0,0,0,0,"","","@xadicha747"],["NO-245","Shokirova  Yulduz","+998936939992","Bekor qildi","","","Onlayn Ariza","","","Quwayt, Turkiya","",0,0,0,0,0,0,0,"","","@xadicha747"],["NO-248","Asadbek","+998934773216","Boglanildi","","","Telefon","","Sarvarbek - Sotuv Menejeri","germaniyaga ingliz rus tii  maslahatlashib aloqaga chiqadi","",0,0,0,0,0,0,0,"","",""],["NO-249","Abduvosid Baxtiyorov","+998906250909","Boglanildi","","","Telefon","","Muhammad Rizo - Sotuv Menejeri","xusanxon esdan chiqardi asaka 2-kotarmad","",0,0,0,0,0,0,0,"","",""],["NO-250","sohibjon","+998930505223","Bekor qildi","","","Telefon","","Xusanxon - Konsultant","ozi tel qiladi","",0,0,0,0,0,0,0,"","",""],["NO-251","Baxodir","+998 99 4434313","Boglanildi","","","Telefon","","Asadulloh - Konsultant","28 y, namangan, Germaniyaga qiziqyapti 2- malumot qisqa berildi, kelib ketsin 15minta qayta qiladi","",0,0,0,0,0,0,0,"","",""],["NO-252","Elshod","+998 90 833 5888","Boglanildi","","","Telefon","","Asadulloh - Konsultant","Samarqandlik, Germaniyaga 37, Rus tili, Taksi. BC. Moliya. 1, 2 kunda aloqaga chiqilsin aloqa yoq","",0,0,0,0,0,0,0,"","",""],["NO-256","Nodir","+998 50 301 7377","Boglanildi","Serbiya","","Telefon","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","Germaniyaga qiziqyapti, 26. Arxitektura kolleji. Remontchi. Rus tili yaxshi. Serbiyaga tashviq qilin","",0,0,0,0,0,0,0,"","",""],["NO-257","Abdunosir","+998 95 095 5202","Bekor qildi","Aniq emas","","Telegram","","Xusanxon - Konsultant","Rus tili bilekan, Ertaga tel qilinsin  qaytarib yuboradi  yengil ish chiqsa telefon qilinsin tezro k","",0,0,0,0,0,0,0,"","",""],["NO-258","Mansurxoja","+998 88 181 2779","Bekor qildi","","","Telefon","","","Turkiyaga qurilish. Shartnoma onlayn tashlansin. kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-259","Fozil","+998 99 136 3496","Boglanildi","","","Telefon","","Xusanxon - Konsultant","Samarqand, rus, turk, ingliz tili.  telefoni chaqirmadi 29 yosh","",0,0,0,0,0,0,0,"","",""],["NO-260","_","+998 93 477 3216","Boglanildi","Aniq emas","","Telefon","","Xusanxon - Konsultant","Til yo’q, Tel qilinsin deb qizlar berdi 10 minut gaplashdm lekin eslomadm kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-261","Asilbek","+998936327900","Boglanildi","","","Telegram","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","BC bor, Rus yaxshimas. Erta inding o'ylab javob beradi  SHANBA kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-262","Shodiyorbek Mamadaliyev","+998944772192","Boglanildi","Serbiya","","Onlayn Ariza","","Xusanxon - Konsultant","Serbiya  kotarmadi 2- Podsobniylik, Almatura. yoki Turkiya. Juma keladi Sharxon masheniklada puli bo","",0,0,0,0,0,0,0,"","","+998944772192"],["NO-264","Abdurahmon","+998990961819","Boglanildi","","","Telegram","","Sarvarbek - Sotuv Menejeri","Turkiya qurilish, narxlar tushintirildi. Bugun abettan keyin tel qilinsin rulda ozi qaytaradi","",0,0,0,0,0,0,0,"","",""],["NO-265","Nasibillo","+998504558894","Keyinchalik","","","Telegram","","Asadulloh - Konsultant","G'isht teruvchi, Serbiya. Bugun kechga keladi. Turkiyaga qurilish, o’ylab javib aytadi. Rus yaxshi. ","",0,0,0,0,0,0,0,"","",""],["NO-267","Qodirjon","+998990513100","Boglanildi","Turkiya","","Telegram","","Asadulloh - Konsultant","Turkiya qurilish, Bolgariyaga ketmoqchi. Namangandan. Bu hafta keladi. Sudlanganlik bor 2- ko’tarmad","",0,0,0,0,0,0,0,"","",""],["NO-268","Zokirjon","+998973399489","Anchagacha Kotarmadi","","","Telegram","","Muhammad Rizo - Sotuv Menejeri","2 yarim, 3 larga keladi.  Santexnika, Monalit, karkaz, Elektrik 2-kotarmadi  3-kotarmadi 4- 5-yanvar","",0,0,0,0,0,0,0,"","",""],["NO-274","Iqboljon Hakimov","+998905407107","Boglanildi","","","Telegram","","Xusanxon - Konsultant","Rus tili, Bu hafta, 50+ y. kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-275","Alodatsiz","+998 88 9149606","Boglanildi","Serbiya","","Telefon","","Xusanxon - Konsultant","tg orqali yozadi litsenziya soardi samarqandlik 2- Litsenziya tashlandi. kotarmadi  3-ochirilgan","",0,0,0,0,0,0,0,"","",""],["NO-276","Jamshidbek","+998 90 763 9085","Boglanildi","Germaniya","","Telegram","","Asadulloh - Konsultant","Germaniya til kursi, 22 y. Lokatsiya tashlandi. raqam notogri","",0,0,0,0,0,0,0,"","",""],["NO-283","Muhammad","+998900502229","Bekor qildi","","","Telefon","","","Elektrik kollej diplom bor. 1- ko'tarmadi Onlayn shartnoma tashlandi, Namanagandan vaqt topib keladi","",0,0,0,0,0,0,0,"","",""],["NO-285","Komiljon Komilov","+998935901110","Boglanildi","","","Onlayn Ariza","","Asrorbek - Sotuv/Hujjat Menejeri, Xusanxon - Konsultant","Türkiye, Ko’tarmadi.  1-dekabrda kelishi mumkin  kotarmadi","",0,0,0,0,0,0,0,"","","+998935901110"],["NO-287","Akbarali Gulomov","+998883992992","Boglanildi","","","Telegram","","Asadulloh - Konsultant, Xusanxon - Konsultant","Rus tili oz biladi, 33 y, Shanba  Keladi yangi yilda keladi  3-kotarmadi, Vohada ekan.  Dushanba. 1 ","",0,0,0,0,0,0,0,"","",""],["NO-288","Fozil Muhiddinov","+998907966644","Bekor qildi","","","Telegram","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","1-Antena bor joyga o'tib qivoradi. 2-Moshina remont, Zavod, Rus tili yaxshi,  3-Namangandan, o’zi al","",0,0,0,0,0,0,0,"","",""],["NO-289","Ravshanbek Sharipov","+998771930721","Boglanildi","Rossiya","","Telegram","","Sarvarbek - Sotuv Menejeri","2004, dushunba abettan keyin. hozir keladi 20 minta  Rossiya parnikka ketmoqchi, faqat zapretini tek","",0,0,0,0,0,0,0,"","",""],["NO-290","Polsha furaga","+998 99 5397904","Boglanildi","","","Telegram","","Asadulloh - Konsultant","bogishamol furachi 45 yosh  Payshanba abettan oldin telefoni uyda ekan ozi boglanadi ekan  Galati ga","",0,0,0,0,0,0,0,"","",""],["NO-292","Jamshidbek","+998 50 377 4217","Boglanildi","","","Telegram","","Asadulloh - Konsultant","Asakadan Eretaga keladi, germaniya til kursi raqam boshqa odam olgan","",0,0,0,0,0,0,0,"","",""],["NO-295","Мамажонов","+998973206888","Boglanildi","","","Telegram","","Asadulloh - Konsultant","1- Ko’tarmadi 2-kotarmadi","",0,0,0,0,0,0,0,"","","985 646-57-97"],["NO-296","Rahmonov Nozim","+998905717879","Boglanildi","Bolgariya","","Onlayn Ariza","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","Bolgariya  1- ko’tarmadi, 47y. Qishloq xo’jalik. Juma ertalab keladi. 2- Jumadan keyin keladi. Shanb","",0,0,0,0,0,0,0,"","","Muxammad Nozim"],["NO-297","36","+998 978 9006","Boglanildi","","","Telegram","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","36 y, Zavod 1-kotarmadi","",0,0,0,0,0,0,0,"","","+998 934142444"],["NO-299","Ulugbek Sharipov","+998 91 174 4426","Anchagacha Kotarmadi","Rossiya","","Telegram","","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","Bolgari q.xo’jalik uchun topshirgandi ertaroq ketsa bo’ladimi diyapti, Turkiya va Rossiyaga ertaroq ","",0,0,0,0,0,0,0,"","",""],["NO-300","Jumanov Abdurauf","+998937069663","Boglanildi","Bolgariya","","Onlayn Ariza","","Asadulloh - Konsultant","Bolgariya , Asakadan 26 y, Q.Xo’jalik, Rus tili. Yangi haftaga Dushanbaga keladi. hozir lecheniyada.","",0,0,0,0,0,0,0,"","","@no_time_to_die_100"],["NO-302","Турсунов Алишер","+998947670184","Keyinchalik","","","Onlayn Ariza","","Asadulloh - Konsultant","Bolgariya 1- Band tushdi, Rus tili yaxshi. Telefon qiladi. Qilmassa Shanba xabar olinsin","",0,0,0,0,0,0,0,"","","+79251919639"],["NO-304","Масадова Назирахон","+998901711688","Boglanildi","Bolgariya","","Onlayn Ariza","","Asadulloh - Konsultant, Asrorbek - Sotuv/Hujjat Menejeri","Балгаря 2- ko’tarmadi","",0,0,0,0,0,0,0,"","","Йук"],["NO-306","Muhammadsharif Turgunivich","+998936880970","Boglanildi","Rossiya","","Telegram","","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","Rossiyaga vakansiyalar tg’dan tashlansin. Namangan viloyati kotarmadi 4-aparat ochrilgan","",0,0,0,0,0,0,0,"","",""],["NO-307","Muahmmadamin","+998 91 6057409","Keyinchalik","Bolgariya","","Telegram","","Asadulloh - Konsultant","Rus tili yaxshi, zooinjineriya bo’yicha o’qigan, BC bor, Davlat ishlarida ishlagan. 1- Jumadan keyin","",0,0,0,0,0,0,0,"","",""],["NO-308","Bahodir Nurmatov","+998503017206","Boglanildi","Serbiya","","Telegram","","Xusanxon - Konsultant","Rus tili, Zavod va Plotnik. Serbiya. Ertaga vidyo tashledi kotarmadi dushanba keladi  seshanba kelad","",0,0,0,0,0,0,0,"","",""],["NO-309","NURIDINBEK","+998949912909","Boglanildi","Bolgariya","","Onlayn Ariza","","Xusanxon - Konsultant","Мева ва сабзавод териш  Jalaquduqli Dushanba keladi Kotarmadi 10 kunda habar olinsin pasport almasht","",0,0,0,0,0,0,0,"","","998949912909"],["NO-310","Юнусов","+998979880081","Bekor qildi","Bolgariya","","","Erkak","Muhammadayub - Call Center","Балгария toshkent 1 2 kunda keladi 10-15 kunda keladi toshkenta ekan serbiyaga qiziqdi  hali ham tos","",0,0,0,0,0,0,0,"","","+998979880081"],["NO-311","Nodirbek","+99890 5251673","Bekor qildi","Rossiya","","Telegram","","Asadulloh - Konsultant","Oshpazlikka 1- Shanbalarga o’tishi mumkin, kelmasa seshanba qilinsin turkiyaga ketiwyapdi ekan","",0,0,0,0,0,0,0,"","",""],["NO-312","Akmal","+998972575990","Boglanildi","Turkiya","","Telegram","","Xusanxon - Konsultant","35 yosh Namangan. Asosan turkiyadagi ishlarga qiziqyapti. O'rta maxsus tamomlagan. Til bilmaydi 1-Va","",0,0,0,0,0,0,0,"","",""],["NO-313","yevropaga qiziqtirish kerak","+998934017080","Boglanildi","","","Onlayn Ariza","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","32 yosh  rus tilini biladi faqat korega qiziqyapti yevropa ishlarini tavsiya qildim oyligi yaxshi bo","",0,0,0,0,0,0,0,"","",""],["NO-314","Bahrom Nasrullayev","+998914524225","Bekor qildi","Germaniya","","Telefon","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","Germaniya til kursi. 25 y, Seshanba keladi. Tel qilinsin. kotarmadi   toshkentlik ekan boshqa consul","",0,0,0,0,0,0,0,"","",""],["NO-316","Komiljon","+998880990402","Boglanildi","Bolgariya","","Telefon","","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","namangan 23 yosh rus tilini osiyodagi hamma joyga chiqgan xarvatiyaga qiziqyapd BC qaytarib yuboradi","",0,0,0,0,0,0,0,"","",""],["NO-319","Dilafruz","+998889846068","Boglanildi","","","Telefon","","Sarvarbek - Sotuv Menejeri","40 yosh ingliz tili o'qituvchisi yevropa davlatlariga iwga qiziqish bildryapti  Andijonli  keyngi  x","",0,0,0,0,0,0,0,"","",""],["NO-321","Nurillo","+998973461078","Boglanildi","Slovakiya","","Telefon","","Xusanxon - Konsultant","Dushanba tel qilinsin dushanba kelioshi mumkin sharxon picoqci kelyotib ozi tel qiladi ozi tel qladi","",0,0,0,0,0,0,0,"","",""],["NO-324","Zuxra Abdurahmanova","+998 91 173 78 34","Bekor qildi","","","Telegram","","Asadulloh - Konsultant","Turkiya mehmonxona,  Seshanba abettan keyin, 5 larga keladi.","",0,0,0,0,0,0,0,"","",""],["NO-325","Bekmurod","+998941046868","Boglanildi","","","Telefon","","Xusanxon - Konsultant","farzandini o'quv markaziga olib kelgach keladi kotarmadi   40 rus tili ingliz tili hozirda kores til","",0,0,0,0,0,0,0,"","",""],["NO-333","RAKHMON AKHMADALIEV","+79248251123","Boglanildi","Bolgariya","","Onlayn Ariza","","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","Qurilish","",0,0,0,0,0,0,0,"","","+79248251123"],["NO-337","Akbarali","+998945191797","Bekor qildi","Aniq emas","","","","Xusanxon - Konsultant","surxandaryo rus tilini biladi serbiya boyicha cunsultatsiya berildi chetga chiqmesan debti uydagilar","",0,0,0,0,0,0,0,"","",""],["NO-341","Рахимов Dilshodbek","+998993933995","Qilindi","Bolgariya","","Telegram","","Xusanxon - Konsultant","европа OILAVIY shanba tezro chiketish kk kotarmadi","",0,0,0,0,0,0,0,"","","@raximvv"],["NO-342","Xamzabek","+998942211824","Boglanildi","Bolgariya","","Onlayn Ariza","","Muhammad Rizo - Sotuv Menejeri","Bolgariya  samarqandlik balgariya qurilishni bilmaydi tgdan boglanilsin","",0,0,0,0,0,0,0,"","","xamzabekxoliqov5@gmail.com"],["NO-343","Қамбаров Шерзод","+998998485188","Boglanildi","","","Onlayn Ariza","","Xusanxon - Konsultant","Наманган  ochirilgan tgdan yozdik ochirilgan","",0,0,0,0,0,0,0,"","","998 99 848 51 88"],["NO-344","Mansur aka","+998904608662","Boglanildi","","","Telegram","","Muhammad Rizo - Sotuv Menejeri","Rus tilini biladi 28 yosh  oyligi yaxshi ish chiqsa aloqaga chiqilsin  stiker 2-kotarmadi","",0,0,0,0,0,0,0,"","","@mansh641"],["NO-345","Nurbek Okbutayev","+998991532838","Bekor qildi","Bolgariya","","Onlayn Ariza","Erkak","Xusanxon - Konsultant","1-Bolgariya 2-Sirdaryo metrolog meva sabzavod 3-elektirik dushanba tel qilinsin 4-kotarmadi 5-qaytar","",0,0,0,0,0,0,0,"","","Nurbek"],["NO-346","Komiljon","+998956963733","Boglanildi","Aniq emas","","Onlayn Ariza","","Sarvarbek - Sotuv Menejeri, Xusanxon - Konsultant","Bolgariya 1-5 6 oyda prava chiqadi instuktur avta shkolada traktorga yevropada ish topish kerak xora","",0,0,0,0,0,0,0,"","",""],["NO-351","Кодиров Улугбек","+998909380066","Boglanildi","Turkiya","","Onlayn Ariza","","Asadulloh - Konsultant","Kotarmadi turkiyaga toshkentlu abetda asadullo aka tel qiladi 2- Bek decor deporti bor, o’qish orqal","",0,0,0,0,0,0,0,"","","@sal99las"],["NO-352","ALIJONOV FAZLIDDIN","+998991084243","Bekor qildi","Bolgariya","","Onlayn Ariza","Erkak","Xusanxon - Konsultant","Bolgariya  juma svarshik fargonali til bilish darajasi soralmadi Oylab koradi serbiya ham taklif qil","",0,0,0,0,0,0,0,"","","@AlijonovFazliddin"],["NO-353","Mansur","+998904608662","Boglanildi","Bolgariya","","Telegram","","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","rus tilini biladi 45 yosh meva sabzavod terish dastavka bank 2-bloklap qoygan","",0,0,0,0,0,0,0,"","",""],["NO-354","Xorazim","+998882282272","Bekor qildi","Serbiya","","Telegram","Erkak","Muhammadayub - Call Center","35 yosh maslahat qiladi 1-ochrilgan  2-ozi qivoradi 3- mavjud bolmagan raqam","",0,0,0,0,0,0,0,"","",""],["NO-355","Abdurahim","+998995042875","Boglanildi","","","Telegram","","Muhammad Rizo - Sotuv Menejeri","50, Rus tili yaxshi, Buxoro. Noyabirning oxirida","",0,0,0,0,0,0,0,"","",""],["NO-356","Shukurboy Anorboyev","+998771414547","Boglanildi","Bolgariya","","Onlayn Ariza","","Asadulloh - Konsultant, Sarvarbek - Sotuv Menejeri","Bolgariya rus tilini biladi 31 yosh  kk hujjatlar aytilsin tg boglanilsin nomer boshqa odamda","",0,0,0,0,0,0,0,"","","+998771414547"],["NO-357","BONU","+998910689783","Bekor qildi","Rossiya","","Telegram","","Xusanxon - Konsultant","Andijon boshqa gapiz yomi shamba keladi boshqa joyga ishga ketibdi","",0,0,0,0,0,0,0,"","",""],["NO-359","👍👍👍","+998946021483","Boglanildi","Rossiya","","Telegram","","Asadulloh - Konsultant","Kotarmadi 2-kotarmadi 3-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-362","O’tkir","+998936120340","Keyinchalik","","","Telegram","","Xusanxon - Konsultant","aloqaga chiqmay qoydi yanvarga yash bolaku bu","",0,0,0,0,0,0,0,"","",""],["NO-363","Halilov Akmaljon","+998905309966","Anchagacha Kotarmadi","Bolgariya","","Onlayn Ariza","","Xusanxon - Konsultant","Bolgariya boglanb bolmadi kotarmadi  boglanib bolmadi","",0,0,0,0,0,0,0,"","","+998905309966"],["NO-364","Muso","+998200173201","Keyinchalik","Germaniya","","Telegram","","Xusanxon - Konsultant","bu yil bitiradi telini  kotarmadi dushanba keladi","",0,0,0,0,0,0,0,"","",""],["NO-365","Sarvar","+998335706970","Boglanildi","Germaniya","","Telegram","","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","1-kotarmadi 2-ko’tarmadi. tgdan boglandik","",0,0,0,0,0,0,0,"","",""],["NO-366","Bexruz","+99899 062 55 70","Boglanildi","Serbiya","","Telegram","","Asadulloh - Konsultant","Surxandaryo Serbiya tavsiya qilinsin 1-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-367","Õtkir","+998936120340","Boglanildi","Rossiya","","","","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","rus tili 40 toshkentlu ayol kishi  shartnoma qilinishi kk tashlab berildi","",0,0,0,0,0,0,0,"","",""],["NO-368","Abdulxamidov Diyorbek","+998958503366","Boglanildi","Germaniya","","Telegram","","Xusanxon - Konsultant","Germaniya til kursi boyicha kansultatsiya berildi 1 2 kunda javobini etadi kotarmadi boglanib bolmad","",0,0,0,0,0,0,0,"","",""],["NO-369","SARVAR","+998330410472","Boglanildi","Rossiya","","Telegram","","Asadulloh - Konsultant","Dehqon toshkentli ochrilgan","",0,0,0,0,0,0,0,"","",""],["NO-370","Zafar","+998950848464","Boglanildi","Bolgariya","","Telegram","","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","41 yosh rus tilini biladi toshkentli 2-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-371","Dilmurod","+998993234973","Boglanildi","Bolgariya","","Telegram","Erkak","Asadulloh - Konsultant, Asrorbek - Sotuv/Hujjat Menejeri","1-rus tilini biladi BC toshkentli bc boyicha vakansiya kelganda aloqaga chiqamiz ekan  2- BC svarshi","",0,0,0,0,0,0,0,"","",""],["NO-373","Akjigit Sarsenbayev","+998991660127","Boglanildi","Bolgariya","","","","Sarvarbek - Sotuv Menejeri","Bolgaria Yevropa rus tili b2 meva sabzavot  toshket kotarmadi","",0,0,0,0,0,0,0,"","","@nur_uvc"],["NO-375","Рустам Дилшод","+79770741994","Boglanildi","","","","","Muhammad Rizo - Sotuv Menejeri","Болгария","",0,0,0,0,0,0,0,"","","+998770394371"],["NO-376","Dilshod","+998 77 039 43 71","Anchagacha Kotarmadi","","","Telefon","","Xusanxon - Konsultant","Qashqadaryo, Serbiya gisht teruvchilik tavsiya qilindi. o’ylab ko’raman dedi. kotarmadi 4-kotarmadi","",0,0,0,0,0,0,0,"","",""],["NO-377","Mustafoqulov Davron","+998943622170","Boglanildi","Bolgariya","","Telegram","","Asadulloh - Konsultant","Artel aksiyadorlik jamiyatk 1- ko’tamadi, tg’dan vakansiyalar tashlangan ojidaniya boshqa yonalishga","",0,0,0,0,0,0,0,"","","@Davron2170"],["NO-378","Abdunabiyev Javohir","+998931571002","Boglanildi","","","Onlayn Ariza","","Muhammad Rizo - Sotuv Menejeri","Olma market  kotarmadi 3-mipdan qarzim bor dedi","",0,0,0,0,0,0,0,"","","@javohirbek10"],["NO-379","Turaboev Zoir","+998900015192","Bekor qildi","","","Onlayn Ariza","","Xusanxon - Konsultant","kotarmadi davlatdan chiqib keta olmaydi","",0,0,0,0,0,0,0,"","","Zoir turaboev"],["NO-381","BOVANOV Sherxon Muxammadi oʻgʻli","+998880619396","Boglanildi","Turkiya","","Onlayn Ariza","","Xusanxon - Konsultant","Turkiyaga   yangi yildan keyin aloqaga chiqilsin 3-kotarmadi","",0,0,0,0,0,0,0,"","","Burxon bovanov"],["NO-384","Aliyeva Malika","+9989256187","Boglanildi","Rossiya","","Telegram","","Asadulloh - Konsultant, Muhammad Rizo - Sotuv Menejeri","Toshkent, 41, Xo’jayini bilan maslahatylashib tel qiladi. Bir haftada aloqaa chiqilsin 3-nomer xato","",0,0,0,0,0,0,0,"","",""]];
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const NOW = new Date();
const isOD = d => d && new Date(d) < NOW;
const isSoon = d => { if(!d)return false; const v=(new Date(d)-NOW)/864e5; return v>=0&&v<=2; };
const fmtD = d => { try{return new Date(d).toLocaleDateString("uz-UZ",{day:"2-digit",month:"short"});}catch{return d||"–";} };
const fmtM = n => !n?0: n>=1000000?`${(n/1000000).toFixed(2)} mln`:n>=1000?`${(n/1000).toFixed(0)}K`:n;
const fmtMs = n => !n?0: n>=1000000?`${(n/1000000).toFixed(1)}M`:n>=1000?`${(n/1000).toFixed(0)}K`:n;
const uid = () => Date.now()+Math.floor(Math.random()*1000);
const dateRange = (d, range) => {
  const n = new Date(); const dt = new Date(d);
  if(range==="today") { const s=new Date(n); s.setHours(0,0,0,0); return dt>=s; }
  if(range==="week")  { const s=new Date(n-7*864e5); return dt>=s; }
  if(range==="month") { const s=new Date(n.getFullYear(),n.getMonth(),1); return dt>=s; }
  return true;
};

// ─── ICONS ────────────────────────────────────────────────────────────────────
const I = {
  dash:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  pipe:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="4" height="18" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="11" width="4" height="10" rx="1"/></svg>,
  list:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></svg>,
  task:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  money: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  team:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  flag:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  chart: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  gear:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  logout:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  plus:  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  x:     <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  bell:  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  search:<svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  edit:  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  sun:   <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  chev:  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
  phone: <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  up:    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  salary:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  report:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  clock: <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function Pill({sk}) {
  const T=useT(); const s=gS(sk);
  return <span style={{background:`${s.c}${T.dark?"33":"18"}`,color:s.c,border:`1px solid ${s.c}${T.dark?"55":"33"}`,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,whiteSpace:"nowrap"}}>{s.label}</span>;
}
function Av({id,team,size=26}) {
  const T=useT(); const u=team?.find(t=>t.id===id);
  if(!u) return null;
  return <div title={u.name} style={{width:size,height:size,borderRadius:"50%",background:`${u.color}22`,border:`1.5px solid ${u.color}88`,color:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.36,fontWeight:800,flexShrink:0}}>{u.av}</div>;
}
function StatCard({icon,label,value,sub,color}) {
  const T=useT(); const c=color||T.accent;
  return <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px"}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:"0.05em",fontWeight:600}}>{label}</span><span style={{fontSize:18}}>{icon}</span></div>
    <div style={{fontSize:22,fontWeight:800,color:T.text,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:T.muted,marginTop:2}}>{sub}</div>}
  </div>;
}
function Modal({children,onClose,width=480}) {
  const T=useT();
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:16}}>
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,width:"100%",maxWidth:width,maxHeight:"92vh",overflowY:"auto",boxShadow:T.shadow}}>{children}</div>
  </div>;
}
// Searchable select for leads/team
function SearchSelect({items,value,onChange,placeholder}) {
  const T=useT(); const [q,setQ]=useState(""); const [open,setOpen]=useState(false);
  const ref=useRef();
  const fil=items.filter(it=>!q||it.label.toLowerCase().includes(q.toLowerCase())||it.id?.toString().includes(q)||it.phone?.includes(q));
  const sel=items.find(it=>it.value===value);
  return <div ref={ref} style={{position:"relative"}}>
    <div onClick={()=>setOpen(o=>!o)} style={{padding:"8px 10px",borderRadius:7,border:`1px solid ${T.border}`,background:T.inp,color:sel?T.text:T.muted,fontSize:12,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",userSelect:"none"}}>
      <span>{sel?sel.label:placeholder||"Tanlang"}</span>
      <span style={{color:T.muted,fontSize:10}}>▼</span>
    </div>
    {open&&<div style={{position:"absolute",top:"105%",left:0,right:0,background:T.card,border:`1px solid ${T.border}`,borderRadius:8,boxShadow:T.shadow,zIndex:200,maxHeight:240,overflowY:"auto"}}>
      <div style={{padding:"6px 8px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{position:"relative"}}><span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:T.muted}}>{I.search}</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Qidirish (ID, Ism, Tel)..." style={{width:"100%",padding:"6px 8px 6px 24px",borderRadius:5,border:`1px solid ${T.border}`,background:T.inp,color:T.text,fontSize:11,outline:"none",boxSizing:"border-box"}} autoFocus/></div>
      </div>
      {fil.map(it=><div key={it.value} onClick={()=>{onChange(it.value);setOpen(false);setQ("");}} style={{padding:"8px 10px",cursor:"pointer",fontSize:12,color:T.text,background:it.value===value?`${T.accent}22`:"transparent",borderBottom:`1px solid ${T.border}22`}}
        onMouseEnter={e=>e.currentTarget.style.background=`${T.accent}15`} onMouseLeave={e=>e.currentTarget.style.background=it.value===value?`${T.accent}22`:"transparent"}>
        <div style={{fontWeight:600}}>{it.label}</div>
        {(it.id||it.phone)&&<div style={{fontSize:9,color:T.muted}}>{[it.id,it.phone].filter(Boolean).join(" · ")}</div>}
      </div>)}
      {fil.length===0&&<div style={{padding:12,color:T.muted,fontSize:11,textAlign:"center"}}>Topilmadi</div>}
    </div>}
  </div>;
}
function inp(T) { return {width:"100%",padding:"8px 10px",borderRadius:7,border:`1px solid ${T.border}`,background:T.inp,color:T.text,fontSize:12,outline:"none",boxSizing:"border-box"}; }
function lab(T) { return {fontSize:10,fontWeight:600,color:T.muted,display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.05em"}; }

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────
function FileUpload({label,value,onChange}) {
  const T=useT(); const ref=useRef();
  return <div>
    <div style={{fontSize:10,fontWeight:600,color:T.muted,marginBottom:3}}>{label}</div>
    <input type="file" ref={ref} style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>onChange(ev.target.result);r.readAsDataURL(f);}}/>
    {value
      ?<div style={{display:"flex",gap:5,alignItems:"center"}}>
          {value.startsWith("data:image")&&<img src={value} style={{width:36,height:36,objectFit:"cover",borderRadius:4,border:`1px solid ${T.border}`}} alt=""/>}
          <button onClick={()=>window.open(value,"_blank")} style={{fontSize:9,color:T.green,background:`${T.green}22`,border:`1px solid ${T.green}44`,borderRadius:4,padding:"2px 7px",cursor:"pointer"}}>📎 Ko'r</button>
          <button onClick={()=>onChange(null)} style={{fontSize:9,color:T.red,background:`${T.red}22`,border:`1px solid ${T.red}44`,borderRadius:4,padding:"2px 7px",cursor:"pointer"}}>✕</button>
        </div>
      :<button onClick={()=>ref.current.click()} style={{fontSize:10,color:T.muted,background:T.card2,border:`1px solid ${T.border}`,borderRadius:5,padding:"4px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>{I.up} Yuklash</button>
    }
  </div>;
}

// ─── CV GENERATOR ─────────────────────────────────────────────────────────────
const CV_TEMPLATES = [
  {id:"dviza",  name:"D-Viza (Rus)",     hc:"#1e3a5f", textC:"#ffffff", bg:"#0f1f3d"},
  {id:"sezon",  name:"Sezon (English)",  hc:"#1a4731", textC:"#ffffff", bg:"#0d2818"},
  {id:"witalis",name:"Witalis (RU/EN)",  hc:"#3d1a0a", textC:"#ffffff", bg:"#1f0d05"},
  {id:"modern", name:"Modern (Light)",   hc:"#6366f1", textC:"#ffffff", bg:"#f8fafc"},
];
const CV_LANGS = ["O'zbek","Русский","English","Türkçe","Deutsch","Bulgarian"];

function CVGen({cv,lead,onClose}) {
  const T=useT();
  const [tplId,setTplId]=useState("dviza");
  const [lang,setLang]=useState("Русский");
  const tpl=CV_TEMPLATES.find(t=>t.id===tplId)||CV_TEMPLATES[0];
  const v=cv||{};
  const langs=(v.languages||"").split(",").map(s=>s.trim()).filter(Boolean);
  const isLight=tplId==="modern";

  const L = {
    "O'zbek":{ personal:"Shaxsiy ma'lumotlar",exp:"Ish tajribasi",skills:"Ko'nikmalar",edu:"Ta'lim",langs:"Tillar",extra:"Qo'shimcha" },
    "Русский":{ personal:"Личные данные",exp:"Опыт работы",skills:"Навыки",edu:"Образование",langs:"Языки",extra:"Дополнительно" },
    "English":{ personal:"Personal Details",exp:"Work Experience",skills:"Skills",edu:"Education",langs:"Languages",extra:"Additional" },
    "Türkçe": { personal:"Kişisel Bilgiler",exp:"İş Deneyimi",skills:"Beceriler",edu:"Eğitim",langs:"Diller",extra:"Ek Bilgiler" },
    "Deutsch":{ personal:"Persönliche Daten",exp:"Berufserfahrung",skills:"Fähigkeiten",edu:"Ausbildung",langs:"Sprachen",extra:"Zusätzlich" },
    "Bulgarian":{personal:"Лични данни",exp:"Трудов опит",skills:"Умения",edu:"Образование",langs:"Езици",extra:"Допълнително"  },
  };
  const t=L[lang]||L["Русский"];

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:3000,padding:20,overflowY:"auto"}}>
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,width:"100%",maxWidth:780,padding:22}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
        <h2 style={{margin:0,fontSize:16,fontWeight:800,color:T.text}}>📄 CV Yaratish</h2>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:20}}>{I.x}</button>
      </div>
      {/* Controls */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{flex:1}}><label style={{fontSize:10,fontWeight:600,color:T.muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>Shablon</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {CV_TEMPLATES.map(tm=><button key={tm.id} onClick={()=>setTplId(tm.id)} style={{padding:"5px 12px",borderRadius:6,border:`2px solid ${tplId===tm.id?tm.hc:T.border}`,background:tplId===tm.id?`${tm.hc}33`:"transparent",color:tplId===tm.id?T.text:T.muted,fontWeight:tplId===tm.id?700:400,cursor:"pointer",fontSize:11}}>{tm.name}</button>)}
          </div>
        </div>
        <div><label style={{fontSize:10,fontWeight:600,color:T.muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>Til</label>
          <select value={lang} onChange={e=>setLang(e.target.value)} style={{...inp(T),width:"auto"}}>
            {CV_LANGS.map(l=><option key={l}>{l}</option>)}
          </select>
        </div>
      </div>
      {/* CV Preview */}
      <div style={{background:isLight?"#f8fafc":tpl.bg,borderRadius:10,overflow:"hidden",border:`1px solid ${tpl.hc}44`,fontFamily:"Arial,sans-serif"}}>
        <div style={{background:tpl.hc,padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:20,fontWeight:900,color:"#fff",marginBottom:3}}>{v.surname||""} {v.name||lead.name}</div>
            <div style={{fontSize:13,color:"#ffffffcc"}}>{v.position||lead.position||lead.sector||"Ishchi"}</div>
            <div style={{display:"flex",gap:12,marginTop:7,fontSize:11,color:"#ffffffaa"}}>
              {lead.phone&&<span>📞 {lead.phone}</span>}
              {v.email&&<span>📧 {v.email}</span>}
              {lead.country&&<span>🌍 {lead.country}</span>}
            </div>
          </div>
          {v.photoData&&<img src={v.photoData} style={{width:75,height:75,borderRadius:8,objectFit:"cover",border:"2px solid rgba(255,255,255,0.3)"}} alt=""/>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr"}}>
          <div style={{background:isLight?"#e8eaf6":`${tpl.hc}22`,padding:"16px 14px",borderRight:`1px solid ${tpl.hc}22`}}>
            {[[t.personal,[["Tug'ilgan sana",v.birthdate],["Tug'ilgan joy",v.birthplace],["Fuqarolik",v.nationality||lead.country],["Jinsi",v.gender||lead.gender],["Oilaviy holat",v.maritalStatus],["Bo'y/Vazn",v.heightWeight],["Manzil",v.address]]],[t.langs,langs.map(l=>[l,""])],[t.edu,[[v.education,""]]]].map(([title,rows])=>(
              <div key={title} style={{marginBottom:12}}>
                <div style={{fontSize:9,fontWeight:800,color:isLight?tpl.hc:"#93c5fd",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5,borderBottom:`1px solid ${tpl.hc}44`,paddingBottom:3}}>{title}</div>
                {rows.filter(([val])=>val).map(([val,lb],i)=><div key={i} style={{fontSize:11,color:isLight?"#374151":"#ccc",marginBottom:3}}>{lb&&<span style={{color:isLight?"#6b7280":"#888",fontSize:10}}>{lb}: </span>}{val}</div>)}
              </div>
            ))}
          </div>
          <div style={{padding:"16px 16px"}}>
            {[[t.exp,[v.experience1,v.experience2]],[t.skills,[v.skills]],[t.extra,[v.salary&&`Maosh: ${v.salary}`,v.canFlexHours&&"Qo'sh. soat: Ha",v.notes]]].map(([title,items])=>(
              <div key={title} style={{marginBottom:14}}>
                <div style={{fontSize:9,fontWeight:800,color:isLight?tpl.hc:"#93c5fd",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5,borderBottom:`1px solid ${tpl.hc}44`,paddingBottom:3}}>{title}</div>
                {items.filter(Boolean).map((v2,i)=><div key={i} style={{fontSize:12,color:isLight?"#374151":"#ddd",marginBottom:4,lineHeight:1.6}}>{v2}</div>)}
              </div>
            ))}
          </div>
        </div>
        <div style={{background:`${tpl.hc}22`,padding:"7px 22px",textAlign:"right",fontSize:10,color:isLight?T.muted:"#888"}}>OneJobs CRM · {new Date().toLocaleDateString()}</div>
      </div>
      <div style={{display:"flex",gap:7,justifyContent:"flex-end",marginTop:14}}>
        <button onClick={onClose} style={{padding:"8px 16px",borderRadius:7,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:12,fontWeight:600}}>Yopish</button>
        <button onClick={()=>window.print()} style={{padding:"8px 18px",borderRadius:7,background:tpl.hc,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:12}}>🖨️ Chop etish</button>
      </div>
    </div>
  </div>;
}

// ─── LEAD DRAWER ──────────────────────────────────────────────────────────────
function Drawer({lead, user, team, leads, tasks, onSave, onClose, onAddTask, config, roles, addNotif}) {
  const T=useT();
  const isNew=!lead.id;
  const [form,setForm]=useState({cv:{},history:[],q1:false,q2:false,q3:false,xba:false,kpiSales:false,kpiConsult:false,kpiDocs:false,q1R:null,q2R:null,q3R:null,xbaR:null,sofFoyda:null,docs:{ownerSales:null,ownerConsult:null,ownerDocs:null},...lead,docs:lead.docs||{}});
  const [tab,setTab]=useState("info");
  const [note,setNote]=useState("");
  const [tTitle,setTTitle]=useState(""); const [tDue,setTDue]=useState(""); const [tAsgn,setTAsgn]=useState(user.id);
  const [showCV,setShowCV]=useState(false);
  const photoRef=useRef();
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const cv=(k,v)=>setForm(p=>({...p,cv:{...(p.cv||{}),[k]:v}}));
  const d=(k,v)=>setForm(p=>({...p,docs:{...(p.docs||{}),[k]:v}}));
  const perm=roles[user.role]||{};
  const canOwner=perm.canOwner;
  const canEdit=perm.canEdit;
  const isPartner=user.role==="partner";
  const s=gS(form.status);
  const isDone=DONE.includes(form.status);
  const leadTasks=tasks.filter(t=>t.leadId===lead.id);
  const addNote=()=>{if(!note.trim())return;f("history",[...(form.history||[]),{text:note,by:user.id,at:new Date().toISOString()}]);setNote("");};
  const addTask=()=>{if(!tTitle.trim())return;onAddTask({id:uid(),title:tTitle,assignee:Number(tAsgn),leadId:form.id,priority:"medium",status:"todo",due:tDue,createdBy:user.id,at:new Date().toISOString(),desc:""});setTTitle("");setTDue("");};
  const teamOpts=team.filter(t=>t.active!==false&&t.role!=="partner").map(t=>({value:t.id,label:t.name,id:t.id,phone:t.phone}));

  const TABS=[
    {k:"info",l:"Ma'lumot"},
    {k:"owners",l:"Mas'ullar"},
    {k:"kpi",l:"KPI"},
    {k:"pay",l:"To'lovlar"},
    {k:"docs",l:"Hujjatlar"},
    {k:"cv",l:"CV"},
    {k:"tasks",l:`Vazifalar(${leadTasks.length})`},
    {k:"notes",l:`Izohlar(${(form.history||[]).length})`},
  ];
  const inpS=inp(T); const labS=lab(T);

  return <div style={{position:"fixed",inset:0,zIndex:300,display:"flex"}}>
    {showCV&&<CVGen cv={form.cv} lead={form} onClose={()=>setShowCV(false)}/>}
    <div onClick={onClose} style={{flex:1,background:"rgba(0,0,0,.5)"}}/>
    <div style={{width:530,background:T.bg,borderLeft:`1px solid ${T.border}`,display:"flex",flexDirection:"column",boxShadow:T.shadow}}>
      {/* Header */}
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,background:T.card,flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,color:T.accent,fontWeight:700,letterSpacing:"0.08em",marginBottom:2}}>{form.id||"Yangi"}</div>
            <div style={{fontSize:16,fontWeight:900,color:T.text,marginBottom:5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{form.name||"Yangi mijoz"}</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}><Pill sk={form.status}/>{form.country&&<span style={{fontSize:10,color:T.muted}}>🌍 {form.country}</span>}</div>
          </div>
          <button onClick={onClose} style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.muted,marginLeft:8}}>{I.x}</button>
        </div>
        {!isPartner&&<div>
          <label style={labS}>Holat</label>
          <select value={form.status} onChange={e=>f("status",e.target.value)} style={{...inpS,fontWeight:700,color:s.c}}>
            {STAGES.map(st=><option key={st.key} value={st.key}>{st.label}</option>)}
          </select>
          {isDone&&<div style={{marginTop:8,background:`${T.green}15`,border:`1px solid ${T.green}44`,borderRadius:7,padding:"8px 10px"}}>
            <label style={{...labS,color:T.green}}>💰 Sof Foyda (Jo'nab ketganda)</label>
            <input type="number" value={form.sofFoyda||""} onChange={e=>f("sofFoyda",Number(e.target.value)||null)} style={inpS} placeholder="0"/>
          </div>}
        </div>}
      </div>
      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${T.border}`,background:T.card,overflowX:"auto",flexShrink:0}}>
        {TABS.filter(t=>!isPartner||["docs","cv","info"].includes(t.k)).map(({k,l})=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:"7px 10px",border:"none",borderBottom:tab===k?`2px solid ${T.accent}`:"2px solid transparent",background:"none",cursor:"pointer",fontSize:10,fontWeight:tab===k?700:400,color:tab===k?T.text:T.muted,whiteSpace:"nowrap"}}>{l}</button>
        ))}
      </div>
      <div style={{padding:"14px 16px",flex:1,overflowY:"auto"}}>
        {/* INFO */}
        {tab==="info"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <div style={{gridColumn:"1/-1"}}><label style={labS}>Ism Familiya *</label><input value={form.name||""} onChange={e=>f("name",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}/></div>
          <div><label style={labS}>Telefon</label>
            <div style={{display:"flex",gap:5}}>
              <input value={form.phone||""} onChange={e=>f("phone",e.target.value)} disabled={!canEdit&&!isNew} style={{...inpS,flex:1}}/>
              {form.phone&&<a href={`tel:${form.phone}`} style={{padding:"7px 8px",borderRadius:6,background:`${T.green}22`,color:T.green,border:`1px solid ${T.green}44`,fontSize:11,textDecoration:"none",display:"flex",alignItems:"center",flexShrink:0}}>{I.phone}</a>}
            </div></div>
          <div><label style={labS}>Telegram</label><input value={form.telegram||""} onChange={e=>f("telegram",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}/></div>
          <div><label style={labS}>Jinsi</label><select value={form.gender||""} onChange={e=>f("gender",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}><option value="">–</option><option>Erkak</option><option>Ayol</option></select></div>
          <div><label style={labS}>Mamlakat</label><select value={form.country||""} onChange={e=>f("country",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}><option value="">–</option>{config.countries.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={labS}>Soha</label><select value={form.sector||""} onChange={e=>f("sector",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}><option value="">–</option>{config.sectors.map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label style={labS}>Lavozim</label><select value={form.position||""} onChange={e=>f("position",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}><option value="">–</option>{config.positions.map(p=><option key={p}>{p}</option>)}</select></div>
          <div><label style={labS}>Manba</label><select value={form.source||""} onChange={e=>f("source",e.target.value)} disabled={!canEdit&&!isNew} style={inpS}><option value="">–</option>{config.sources.map(s=><option key={s}>{s}</option>)}</select></div>
          <div style={{gridColumn:"1/-1"}}><label style={labS}>Izoh</label><textarea value={form.comment||""} onChange={e=>f("comment",e.target.value)} disabled={!canEdit&&!isNew} rows={2} style={{...inpS,resize:"vertical"}}/></div>
        </div>}

        {/* OWNERS */}
        {tab==="owners"&&<div>
          <div style={{background:`${T.yellow}15`,border:`1px solid ${T.yellow}33`,borderRadius:8,padding:"9px 12px",marginBottom:14,fontSize:11,color:T.text}}>
            💡 Har bir lead uchun: <b>Mas'ul Sotuvchi</b>, <b>Mas'ul Konsultant</b>, <b>Mas'ul Hujjatchi</b> alohida belgilanadi
          </div>
          {[["ownerSales","💼 Mas'ul Sotuvchi","sales"],["ownerConsult","🎓 Mas'ul Konsultant","docs"],["ownerDocs","📁 Mas'ul Hujjatchi","docs"]].map(([k,label])=>(
            <div key={k} style={{marginBottom:16}}>
              <label style={labS}>{label}</label>
              {canOwner
                ?<SearchSelect items={[{value:null,label:"– Belgilanmagan",id:"",phone:""},...teamOpts]} value={form[k]} onChange={v=>f(k,v)} placeholder="Tanlang"/>
                :<div style={{...inpS,color:T.muted}}>{team.find(t=>t.id===form[k])?.name||"Belgilanmagan"}</div>
              }
              {/* Allow sales to take unassigned */}
              {!form[k]&&roles[user.role]?.canTakeUnassigned&&!canOwner&&(
                <button onClick={()=>f(k,user.id)} style={{marginTop:5,padding:"4px 10px",borderRadius:5,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:10,fontWeight:600}}>Menga olish</button>
              )}
            </div>
          ))}
        </div>}

        {/* KPI */}
        {tab==="kpi"&&<div>
          <div style={{fontSize:11,color:T.muted,marginBottom:14}}>KPI belgilar mas'ul shaxs ishini tasdiqlaydi</div>
          {[["kpiSales","💼 Sotuv KPI","ownerSales","#f97316"],["kpiConsult","🎓 Konsultant KPI","ownerConsult","#22c55e"],["kpiDocs","📁 Hujjatchi KPI","ownerDocs","#06b6d4"]].map(([k,label,ownerKey,c])=>{
            const owner=team.find(t=>t.id===form[ownerKey]);
            return <div key={k} style={{background:form[k]?`${c}15`:T.card2,border:`1px solid ${form[k]?c+"44":T.border}`,borderRadius:9,padding:"12px 14px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:canOwner||(user.id===form[ownerKey])?"pointer":"default",fontSize:13,fontWeight:700,color:form[k]?c:T.sub}}>
                  <input type="checkbox" checked={form[k]||false} onChange={e=>f(k,e.target.checked)} disabled={!canOwner&&user.id!==form[ownerKey]} style={{width:16,height:16,accentColor:c}}/>{label}
                </label>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {owner&&<Av id={owner.id} team={team} size={22}/>}
                  <span style={{fontSize:20}}>{form[k]?"✅":"⬜"}</span>
                </div>
              </div>
              {owner&&<div style={{fontSize:10,color:T.muted,marginTop:4}}>Mas'ul: {owner.name}</div>}
            </div>;
          })}
        </div>}

        {/* PAYMENTS */}
        {tab==="pay"&&!isPartner&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[["q1","1-Qism","q1R","#ec4899"],["q2","2-Qism","q2R","#8b5cf6"],["q3","3-Qism","q3R","#3b82f6"],["xba","XBA","xbaR","#f97316"]].map(([k,lb,rk,c])=>(
            <div key={k} style={{background:form[k]?`${c}15`:T.card2,border:`1px solid ${form[k]?c+"44":T.border}`,borderRadius:9,padding:"12px 13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:form[form[rk]]?6:0}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,fontWeight:700,color:form[k]?c:T.sub}}>
                  <input type="checkbox" checked={form[k]||false} onChange={e=>f(k,e.target.checked)} style={{width:16,height:16,accentColor:c}}/>{lb}
                </label>
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  <span style={{fontSize:16}}>{form[k]?"✅":"⬜"}</span>
                  <FileUpload label="" value={form[rk]} onChange={v=>f(rk,v)}/>
                </div>
              </div>
              {form[rk]&&form[rk].startsWith("data:image")&&<img src={form[rk]} alt="" style={{width:"100%",maxHeight:80,objectFit:"contain",borderRadius:4,marginTop:5,border:`1px solid ${T.border}`}}/>}
            </div>
          ))}
        </div>}

        {/* PARTNER DOCS */}
        {tab==="docs"&&<div>
          <div style={{fontSize:11,color:T.muted,marginBottom:12}}>Hujjatlar yuklash (Hamkor uchun ham mavjud)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["passport","Pasport"],["cv_file","CV (fayl)"],["photo","Rasm (3x4)"],["id_card","ID karta"],["diploma","Diplom"],["doc1","Qo'shimcha 1"],["doc2","Qo'shimcha 2"],["doc3","Qo'shimcha 3"]].map(([k,lb])=>(
              <FileUpload key={k} label={lb} value={(form.docs||{})[k]} onChange={v=>d(k,v)}/>
            ))}
          </div>
        </div>}

        {/* CV */}
        {tab==="cv"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontSize:12,fontWeight:700,color:T.text}}>CV Ma'lumotlari</span>
            <div style={{display:"flex",gap:6}}>
              <a href="https://tally.so/r/Np7BZN" target="_blank" rel="noopener" style={{fontSize:10,color:T.accent,textDecoration:"none",background:`${T.accent}22`,border:`1px solid ${T.accent}44`,borderRadius:5,padding:"3px 8px"}}>🔗 Tally</a>
              <button onClick={()=>setShowCV(true)} style={{fontSize:10,color:"#fff",background:T.purple,border:"none",borderRadius:5,padding:"4px 10px",cursor:"pointer",fontWeight:700}}>📄 CV Ko'rish</button>
            </div>
          </div>
          <input type="file" accept="image/*" ref={photoRef} style={{display:"none"}} onChange={e=>{const fi=e.target.files[0];if(!fi)return;const r=new FileReader();r.onload=ev=>cv("photoData",ev.target.result);r.readAsDataURL(fi);}}/>
          <div onClick={()=>photoRef.current.click()} style={{width:70,height:70,borderRadius:7,border:`2px dashed ${T.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",background:T.card2,marginBottom:12}}>
            {(form.cv||{}).photoData?<img src={form.cv.photoData} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:<><span style={{color:T.muted}}>{I.up}</span><div style={{fontSize:9,color:T.muted,marginTop:2}}>Rasm</div></>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["name","Ism"],["surname","Familiya"],["motherName","Onasining ismi"],["fatherName","Otasining ismi"],["birthplace","Tug'ilgan joy"],["birthdate","Tug'ilgan sana"],["nationality","Fuqarolik"],["gender","Jinsi"],["maritalStatus","Oilaviy holat"],["partnerName","Juftining ismi"],["children","Farzandlar soni"],["heightWeight","Bo'y va vazn"],["address","Manzil"],["motherTongue","Ona tili"],["languages","Bilgan tillar (vergul)"],["education","Ta'lim"],["position","Ishlashi mumkin"],["salary","Istanilgan maosh"],["email","Email"]].map(([k,lb])=>(
              <div key={k} style={["motherName","address","motherTongue","languages","education"].includes(k)?{gridColumn:"1/-1"}:{}}>
                <label style={labS}>{lb}</label>
                <input value={(form.cv||{})[k]||""} onChange={e=>cv(k,e.target.value)} style={inpS}/>
              </div>
            ))}
            {[["experience1","Ish tajribasi 1"],["experience2","Ish tajribasi 2"],["skills","Ko'nikmalar"],["notes","Qo'shimcha"]].map(([k,lb])=>(
              <div key={k} style={{gridColumn:"1/-1"}}><label style={labS}>{lb}</label><textarea value={(form.cv||{})[k]||""} onChange={e=>cv(k,e.target.value)} rows={2} style={{...inpS,resize:"vertical"}}/></div>
            ))}
          </div>
        </div>}

        {/* TASKS */}
        {tab==="tasks"&&!isPartner&&<div>
          <div style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:10,marginBottom:12}}>
            <input value={tTitle} onChange={e=>setTTitle(e.target.value)} placeholder="Vazifa nomi..." style={{...inpS,marginBottom:6}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:6}}>
              <input type="date" value={tDue} onChange={e=>setTDue(e.target.value)} style={inpS}/>
              <select value={tAsgn} onChange={e=>setTAsgn(e.target.value)} style={inpS}>{team.filter(t=>t.role!=="partner"&&t.active!==false).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <button onClick={addTask} style={{padding:"8px 11px",borderRadius:6,background:T.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:700}}>+</button>
            </div>
          </div>
          {leadTasks.map(t=>{const od=isOD(t.due)&&t.status!=="done"; return(
            <div key={t.id} style={{background:T.card2,borderRadius:7,padding:"9px 10px",marginBottom:5,border:`1px solid ${T.border}`,borderLeft:`3px solid ${od?T.red:T.accent}`}}>
              <div style={{fontSize:11,fontWeight:600,color:T.text,marginBottom:2}}>{t.title}</div>
              <div style={{display:"flex",gap:7,alignItems:"center"}}><Av id={t.assignee} team={team} size={15}/><span style={{fontSize:9,color:od?T.red:T.muted}}>{I.clock} {fmtD(t.due)}{od?" ⚠️":""}</span></div>
            </div>
          );})}
        </div>}

        {/* NOTES */}
        {tab==="notes"&&!isPartner&&<div>
          <div style={{display:"flex",gap:7,marginBottom:12}}>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Izoh yozing..." rows={2} style={{...inpS,flex:1,resize:"none"}}/>
            <button onClick={addNote} style={{padding:"0 13px",borderRadius:7,background:T.accent,color:"#fff",border:"none",cursor:"pointer",fontWeight:700}}>+</button>
          </div>
          {[...(form.history||[])].reverse().map((item,i)=>{const u=team.find(t=>t.id===item.by); return(
            <div key={i} style={{display:"flex",gap:7,marginBottom:8}}>
              <Av id={item.by} team={team} size={22}/>
              <div style={{flex:1}}><div style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:7,padding:"7px 10px",fontSize:12,color:T.text,lineHeight:1.5}}>{item.text}</div>
                <div style={{fontSize:9,color:T.muted,marginTop:2}}>{u?.name} · {fmtD(item.at)}</div></div>
            </div>
          );})}
        </div>}
      </div>
      {/* Footer */}
      <div style={{padding:"10px 16px",borderTop:`1px solid ${T.border}`,display:"flex",gap:7,background:T.card,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:12,fontWeight:600}}>Bekor</button>
        <button onClick={()=>onSave(form)} style={{flex:2,padding:"9px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:12}}>💾 Saqlash</button>
      </div>
    </div>
  </div>;
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
function Pipeline({leads, tasks, team, user, open, addLead, config, roles}) {
  const T=useT();
  const perm=roles[user.role]||{};
  const [search,setSearch]=useState(""); const [fOwner,setFOwner]=useState(0);
  const [fCountry,setFCountry]=useState(""); const [fPosition,setFPosition]=useState("");
  const [fDate,setFDate]=useState(""); const [fHasTasks,setFHasTasks]=useState(false);
  const [fSource,setFSource]=useState(""); const [fGender,setFGender]=useState("");
  const [showFilters,setShowFilters]=useState(false);

  const flt=leads.filter(l=>{
    if(search&&!l.name.toLowerCase().includes(search.toLowerCase())&&!l.phone?.includes(search)&&!l.id.includes(search)&&!l.comment?.toLowerCase().includes(search.toLowerCase()))return false;
    if(fOwner&&l.ownerSales!==fOwner&&l.ownerConsult!==fOwner&&l.ownerDocs!==fOwner)return false;
    if(fCountry&&!l.country?.includes(fCountry))return false;
    if(fPosition&&l.position!==fPosition)return false;
    if(fDate&&!dateRange(l.createdAt,fDate))return false;
    if(fHasTasks&&!tasks.some(t=>t.leadId===l.id&&t.status!=="done"))return false;
    if(fSource&&l.source!==fSource)return false;
    if(fGender&&l.gender!==fGender)return false;
    return true;
  });
  const grp={}; STAGES.forEach(s=>{grp[s.key]=flt.filter(l=>l.status===s.key);});
  const inpS=inp(T);

  return <div>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
      <div><h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>Pipeline</h1><p style={{color:T.muted,margin:"1px 0 0",fontSize:10}}>{flt.length} ta</p></div>
      <div style={{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative"}}><span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:T.muted}}>{I.search}</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Qidirish..." style={{...inpS,paddingLeft:23,width:160,fontSize:11}}/></div>
        <button onClick={()=>setShowFilters(f=>!f)} style={{padding:"7px 11px",borderRadius:7,border:`1px solid ${showFilters?T.accent:T.border}`,background:showFilters?`${T.accent}22`:"transparent",color:showFilters?T.accent:T.muted,cursor:"pointer",fontSize:11,fontWeight:showFilters?700:400}}>🔍 Filtr</button>
        <button onClick={()=>{const h=["ID","Ism","Tel","Holat","Mamlakat","Manba","Mas'ul","Izoh"];const r=flt.map(l=>[l.id,l.name,l.phone,l.status,l.country,l.source,l.owner,l.comment?.replace(/,/g," ")||""].join(",")).join("\n");const blob=new Blob([h.join(",")+"\n"+r],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="pipeline.csv";a.click();}} style={{padding:"7px 11px",borderRadius:7,border:`1px solid ${T.border}`,background:T.card,color:T.muted,cursor:"pointer",fontSize:11}}>📥 CSV</button>
        {perm.canEdit&&<button onClick={addLead} style={{display:"flex",alignItems:"center",gap:4,padding:"7px 12px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>{I.plus} Yangi</button>}
      </div>
    </div>
    {/* Advanced filters */}
    {showFilters&&<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:9,padding:"10px 12px",marginBottom:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <select value={fOwner} onChange={e=>setFOwner(Number(e.target.value))} style={{...inpS,width:"auto",fontSize:11}}><option value={0}>Barcha mas'ul</option>{team.filter(t=>t.role!=="partner").map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <select value={fCountry} onChange={e=>setFCountry(e.target.value)} style={{...inpS,width:"auto",fontSize:11}}><option value="">Mamlakat</option>{config.countries.map(c=><option key={c}>{c}</option>)}</select>
      <select value={fPosition} onChange={e=>setFPosition(e.target.value)} style={{...inpS,width:"auto",fontSize:11}}><option value="">Lavozim</option>{config.positions.map(p=><option key={p}>{p}</option>)}</select>
      <select value={fDate} onChange={e=>setFDate(e.target.value)} style={{...inpS,width:"auto",fontSize:11}}><option value="">Barcha vaqt</option><option value="today">Bugun</option><option value="week">Bu hafta</option><option value="month">Bu oy</option></select>
      <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.text,cursor:"pointer"}}><input type="checkbox" checked={fHasTasks} onChange={e=>setFHasTasks(e.target.checked)} style={{accentColor:T.accent}}/>Vazifalari bor</label>
      <select value={fSource||""} onChange={e=>setFSource(e.target.value)} style={{...inpS,width:"auto",fontSize:11}}><option value="">Barcha manba</option>{config.sources.map(s=><option key={s}>{s}</option>)}</select>
      <select value={fGender||""} onChange={e=>setFGender(e.target.value)} style={{...inpS,width:"auto",fontSize:11}}><option value="">Jins</option><option value="Erkak">Erkak</option><option value="Ayol">Ayol</option></select>
      <button onClick={()=>{setFOwner(0);setFCountry("");setFPosition("");setFDate("");setFHasTasks(false);setFSource("");setFGender("");}} style={{padding:"4px 9px",borderRadius:5,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:10,fontWeight:600}}>Tozalash</button>
    </div>}
    <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:12,alignItems:"flex-start"}}>
      {STAGES.map(stage=>{
        const cards=grp[stage.key]||[];
        return <div key={stage.key} style={{minWidth:210,maxWidth:210,flexShrink:0}}>
          <div style={{background:`${stage.c}${T.dark?"22":"15"}`,border:`1px solid ${stage.c}44`,borderRadius:"8px 8px 0 0",padding:"6px 8px",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:10,fontWeight:700,color:stage.c,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:155}}>{stage.label}</span>
            <span style={{fontSize:9,fontWeight:800,background:`${stage.c}22`,color:stage.c,borderRadius:10,padding:"0 5px",border:`1px solid ${stage.c}44`,flexShrink:0}}>{cards.length}</span>
          </div>
          <div style={{background:T.dark?`${T.card}bb`:T.card2,border:`1px solid ${stage.c}22`,borderTop:"none",borderRadius:"0 0 8px 8px",padding:5,minHeight:30}}>
            {cards.map(lead=>{
              const lt=tasks.filter(t=>t.leadId===lead.id&&t.status!=="done"); const od=lt.some(t=>isOD(t.due));
              const owners=[lead.ownerSales,lead.ownerConsult,lead.ownerDocs].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
              return <div key={lead.id} onClick={()=>open(lead)} style={{background:T.card,borderRadius:7,padding:"8px 9px",marginBottom:4,cursor:"pointer",border:`1px solid ${T.border}`,borderLeft:`3px solid ${stage.c}66`,transition:"box-shadow 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow=T.shadow} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                {/* Name + owners */}
                <div style={{display:"flex",justifyContent:"space-between",gap:4,marginBottom:3}}>
                  <span style={{fontSize:11,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{lead.name}</span>
                  <div style={{display:"flex",gap:1,flexShrink:0}}>{owners.map(id=><Av key={id} id={id} team={team} size={14}/>)}</div>
                </div>
                {/* Phone */}
                {lead.phone&&<div style={{fontSize:9,color:T.cyan,marginBottom:2,display:"flex",alignItems:"center",gap:3}}>{I.phone} {lead.phone}</div>}
                {/* Country + Position */}
                <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:3}}>
                  {lead.country&&<span style={{fontSize:8,background:T.card2,color:T.muted,borderRadius:3,padding:"0 4px",border:`1px solid ${T.border}`}}>🌍{lead.country}</span>}
                  {lead.position&&<span style={{fontSize:8,background:`${T.accent}22`,color:T.accent,borderRadius:3,padding:"0 4px"}}>{lead.position}</span>}
                </div>
                {/* Comment */}
                {lead.comment&&<div style={{fontSize:9,color:T.muted,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>💬 {lead.comment}</div>}
                {/* Tasks / payments */}
                <div style={{display:"flex",gap:3,alignItems:"center"}}>
                  {lt.length>0&&<span style={{fontSize:8,color:od?T.red:T.green,fontWeight:700}}>✓{lt.length}{od&&"⚠"}</span>}
                  {(lead.q1||lead.q2||lead.q3||lead.xba)&&<span style={{fontSize:8,color:T.yellow}}>💳</span>}
                  {lead.kpiSales&&<span style={{fontSize:8,background:`${T.green}22`,color:T.green,borderRadius:3,padding:"0 3px",fontWeight:700}}>KPI₁</span>}
                  {lead.kpiConsult&&<span style={{fontSize:8,background:`${T.blue}22`,color:T.blue,borderRadius:3,padding:"0 3px",fontWeight:700}}>KPI₂</span>}
                  {lead.kpiDocs&&<span style={{fontSize:8,background:`${T.cyan}22`,color:T.cyan,borderRadius:3,padding:"0 3px",fontWeight:700}}>KPI₃</span>}
                </div>
                <div style={{fontSize:8,color:T.muted,marginTop:2}}>#{lead.id} · {fmtD(lead.createdAt)}</div>
              </div>;
            })}
            {cards.length===0&&<div style={{textAlign:"center",padding:"10px 0",color:T.border,fontSize:9}}>–</div>}
          </div>
        </div>;
      })}
    </div>
  </div>;
}


// ─── LEADS LIST (Image-style full table) ─────────────────────────────────────
function LeadsList({leads, tasks, team, user, open, addLead, config, roles, setLeads}) {
  const T=useT();
  const perm=roles[user.role]||{};
  const [search,setSearch]=useState(""); const [fGroup,setFGroup]=useState("all");
  const [fCountry,setFC]=useState(""); const [fSource,setFSrc]=useState("");
  const [fOwner,setFOwner]=useState(""); const [fGender,setFG]=useState("");
  const [fQ1,setFQ1]=useState(false); const [fQ2,setFQ2]=useState(false);
  const [fQ3,setFQ3]=useState(false); const [fXba,setFXba]=useState(false);
  const [page,setPage]=useState(1); const [sortCol,setSortCol]=useState("id"); const [sortDir,setSortDir]=useState("desc");
  const [showImport,setShowImport]=useState(false); const [importText,setImportText]=useState("");
  const [importResult,setImportResult]=useState(null);
  const PER=50;
  const csvRef=useRef();
  const inpS=inp(T);

  const STATUS_GROUPS = {
    all:{label:"Barchasi",c:"#6b7280"},
    new:{label:"Yangi",c:"#6366f1"},
    contact:{label:"Aloqa",c:"#f59e0b"},
    deal:{label:"Jarayon",c:"#22c55e"},
    payment:{label:"To'lov",c:"#ec4899"},
    docs:{label:"Hujjatlar",c:"#3b82f6"},
    visa:{label:"Viza",c:"#7c3aed"},
    done:{label:"Tugagan",c:"#166534"},
    lost:{label:"Bekor",c:"#dc2626"},
    hold:{label:"Keyinchalik",c:"#0369a1"},
  };
  const STATUS_TO_GROUP = {
    "Yangi":"new","Qilindi":"new","Boglanildi":"contact","Bog'landi":"contact",
    "Onlayn Suhbat Uchun":"contact","Onlayn Suhbat":"contact","Suhbat":"contact",
    "Shartnoma qildi":"deal","XBA To'lov qildi":"deal","CV Topshirildi":"deal",
    "Interview ga qo'yildi":"deal","Ishga qabul qilindi":"deal",
    "1 - Qism To'landi":"payment",
    "Hujjatlar Tayyorlanmoqda":"docs","Hujjatlar Jonatilishga Tayyor":"docs","Hujjatlar Jonatildi":"docs",
    "Ish shartnomasi keldi":"docs","Ish shartnomasi imzolandi":"docs","Taklifnoma keldi":"docs",
    "Elchixonaga Hujjatlar Tayyor":"visa","Vizaga Topshirildi":"visa","Viza Oldi":"done",
    "Jo'nab ketdi":"done","Viza Rad Etildi":"lost","Viza Rad ❌":"lost",
    "Bekor qildi":"lost","Anchagacha Ko'tarmadi":"lost","Anchagacha Kotarmadi":"lost",
    "Keyinchalik":"hold",
  };

  const allCountries = useMemo(()=>[...new Set(leads.flatMap(l=>(l.country||"").split(",").map(s=>s.trim()).filter(Boolean)))].sort(),[leads]);
  const allSources   = useMemo(()=>[...new Set(leads.map(l=>l.source).filter(Boolean))].sort(),[leads]);
  const allOwners    = useMemo(()=>[...new Set(leads.flatMap(l=>(l.owner||"").split(",").map(s=>{const p=s.trim().split(" - ");return p[0].trim();}).filter(Boolean)))].sort(),[leads]);

  const filtered = useMemo(()=>{
    let arr = leads;
    const q = search.toLowerCase().trim();
    if(q) arr = arr.filter(l=>l.name?.toLowerCase().includes(q)||l.phone?.includes(q)||l.id?.toLowerCase().includes(q)||l.comment?.toLowerCase().includes(q)||l.telegram?.toLowerCase().includes(q));
    if(fGroup!=="all") arr = arr.filter(l=>STATUS_TO_GROUP[l.status]===fGroup);
    if(fCountry) arr = arr.filter(l=>l.country?.includes(fCountry));
    if(fSource) arr = arr.filter(l=>l.source===fSource);
    if(fOwner) arr = arr.filter(l=>l.owner?.includes(fOwner));
    if(fGender) arr = arr.filter(l=>l.gender===fGender);
    if(fQ1) arr = arr.filter(l=>l.q1);
    if(fQ2) arr = arr.filter(l=>l.q2);
    if(fQ3) arr = arr.filter(l=>l.q3);
    if(fXba) arr = arr.filter(l=>l.xba);
    arr = [...arr].sort((a,b)=>{
      let va,vb;
      if(sortCol==="id"){va=parseInt(a.id?.replace("NO-","")||0);vb=parseInt(b.id?.replace("NO-","")||0);}
      else if(sortCol==="name"){return sortDir==="asc"?(a.name||"").localeCompare(b.name||""):(b.name||"").localeCompare(a.name||"");}
      else if(sortCol==="status"){return sortDir==="asc"?(a.status||"").localeCompare(b.status||""):(b.status||"").localeCompare(a.status||"");}
      else if(sortCol==="bal"){va=a.netBalance||0;vb=b.netBalance||0;}
      else{va=0;vb=0;}
      return sortDir==="asc"?va-vb:vb-va;
    });
    return arr;
  },[leads,search,fGroup,fCountry,fSource,fOwner,fGender,fQ1,fQ2,fQ3,fXba,sortCol,sortDir]);

  const totalPages = Math.ceil(filtered.length/PER);
  const pageData = filtered.slice((page-1)*PER, page*PER);

  const resetFilters=()=>{setSearch("");setFGroup("all");setFC("");setFSrc("");setFOwner("");setFG("");setFQ1(false);setFQ2(false);setFQ3(false);setFXba(false);setPage(1);};

  const exportCSV=()=>{
    const h=["ID","Ism","Telefon","Holat","Mamlakat","Soha","Manba","Jinsi","Mas'ul","Izoh","Q1","Q2","Q3","XBA","Kirim","Chiqim","Balans"];
    const rows=filtered.map(l=>[l.id,l.name,l.phone,l.status,l.country,l.sector,l.source,l.gender,l.owner,(l.comment||"").replace(/,/g," "),l.q1?"Ha":"Yo'q",l.q2?"Ha":"Yo'q",l.q3?"Ha":"Yo'q",l.xba?"Ha":"Yo'q",l.totalIncome||0,l.totalExpense||0,l.netBalance||0].join(",")).join("\n");
    const blob=new Blob([h.join(","+"\n"+rows)],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="onejobs_mijozlar.csv";a.click();
  };

  const parseCSVImport=(text)=>{
    const lines=text.trim().split("\n");
    if(lines.length<2)return{error:"CSV bo'sh yoki noto'g'ri"};
    const headers=lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/[^a-z0-9]/g,""));
    const idIdx=headers.findIndex(h=>h.includes("id")||h.includes("no"));
    const nameIdx=headers.findIndex(h=>h.includes("ism")||h.includes("name")||h.includes("familiya"));
    const phoneIdx=headers.findIndex(h=>h.includes("tel")||h.includes("phone"));
    const statusIdx=headers.findIndex(h=>h.includes("holat")||h.includes("status"));
    const countryIdx=headers.findIndex(h=>h.includes("mamla")||h.includes("country"));
    const sourceIdx=headers.findIndex(h=>h.includes("manba")||h.includes("source"));
    const commentIdx=headers.findIndex(h=>h.includes("izoh")||h.includes("comment"));
    const imported=[];
    for(let i=1;i<lines.length;i++){
      const cols=lines[i].split(",");
      if(cols.length<2)continue;
      const id=(idIdx>=0?cols[idIdx]?.trim():"")||`NO-IMP-${Date.now()}-${i}`;
      imported.push({
        id, name:nameIdx>=0?cols[nameIdx]?.trim():"",
        phone:phoneIdx>=0?cols[phoneIdx]?.trim():"",
        status:statusIdx>=0?cols[statusIdx]?.trim():"Yangi",
        country:countryIdx>=0?cols[countryIdx]?.trim():"",
        source:sourceIdx>=0?cols[sourceIdx]?.trim():"",
        comment:commentIdx>=0?cols[commentIdx]?.trim():"",
        q1:false,q2:false,q3:false,xba:false,
        ownerSales:null,ownerConsult:null,ownerDocs:null,
        kpiSales:false,kpiConsult:false,kpiDocs:false,
        cv:{},docs:{},history:[],sofFoyda:null,createdAt:new Date().toISOString().slice(0,10),
      });
    }
    return{rows:imported,count:imported.length};
  };

  const doImport=()=>{
    const r=parseCSVImport(importText);
    if(r.error){setImportResult({error:r.error});return;}
    const newLeads=r.rows.filter(nl=>!leads.some(l=>l.id===nl.id));
    const updated=r.rows.filter(nl=>leads.some(l=>l.id===nl.id));
    setLeads(prev=>{
      const next=[...prev];
      updated.forEach(ul=>{const idx=next.findIndex(l=>l.id===ul.id);if(idx>=0)next[idx]={...next[idx],...ul};});
      return [...next,...newLeads];
    });
    setImportResult({newCount:newLeads.length,updCount:updated.length});
    setImportText("");
  };

  const toggleSort=col=>{if(sortCol===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortCol(col);setSortDir("desc");}setPage(1);};
  const SortTh=({col,label,w})=>{const a=sortCol===col;return<th onClick={()=>toggleSort(col)} style={{padding:"9px 8px",textAlign:"left",fontSize:10,fontWeight:600,color:a?"#0ea5e9":T.muted,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap",cursor:"pointer",userSelect:"none",width:w,background:T.card2,borderBottom:`1px solid ${T.border}`}}>{label}{a?sortDir==="asc"?" ↑":" ↓":""}</th>;};

  return <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0}}>
    {/* Header */}
    <div style={{flexShrink:0,marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
        <div>
          <div style={{fontSize:9,fontWeight:700,color:T.cyan,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>MIJOZLAR RO'YXATI</div>
          <h1 style={{fontSize:20,fontWeight:900,color:T.text,margin:0,letterSpacing:"-0.02em"}}>Mijozlar va ariza</h1>
          <p style={{color:T.muted,fontSize:10,margin:"3px 0 0"}}>Qabul qilish, status va hujjatlar boshqaruvi · Jami: <b style={{color:T.accent}}>{leads.length}</b></p>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setShowImport(s=>!s)} style={{padding:"7px 12px",borderRadius:7,background:showImport?`${T.accent}22`:T.card,color:showImport?T.accent:T.muted,border:`1px solid ${showImport?T.accent+"44":T.border}`,cursor:"pointer",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
            {I.up} CSV Import
          </button>
          <button onClick={exportCSV} style={{padding:"7px 12px",borderRadius:7,background:T.card,color:T.green,border:`1px solid ${T.green}44`,cursor:"pointer",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
            {I.up} Eksport
          </button>
          {perm.canEdit&&<button onClick={addLead} style={{padding:"7px 12px",borderRadius:7,background:"#0ea5e9",color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>{I.plus} Yangi mijoz</button>}
        </div>
      </div>

      {/* CSV Import panel */}
      {showImport&&<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14,marginBottom:10}}>
        <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:6}}>📥 CSV mass import</div>
        <div style={{fontSize:10,color:T.muted,marginBottom:8}}>
          CSV ustunlar: ID, Ism, Telefon, Holat, Mamlakat, Manba, Izoh (birinchi qator — sarlavha)
        </div>
        <textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder={"ID,Ism,Telefon,Holat,Mamlakat,Manba,Izoh\nNO-1001,Alisher,+998901234567,Yangi,Bolgariya,Target,Izoh..."} rows={5} style={{...inpS,resize:"vertical",fontFamily:"monospace",fontSize:11,marginBottom:8}}/>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          <input type="file" ref={csvRef} accept=".csv,.txt" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setImportText(ev.target.result);r.readAsText(f);}}/>
          <button onClick={()=>csvRef.current.click()} style={{padding:"6px 12px",borderRadius:6,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11}}>📂 Fayl</button>
          <button onClick={doImport} disabled={!importText.trim()} style={{padding:"6px 14px",borderRadius:6,background:T.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,opacity:importText.trim()?1:0.5}}>✓ Import qilish</button>
          {importResult&&<span style={{fontSize:11,color:importResult.error?T.red:T.green}}>{importResult.error||`✅ ${importResult.newCount} yangi, ${importResult.updCount} yangilandi`}</span>}
        </div>
      </div>}

      {/* Status group tabs */}
      <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>
        {Object.entries(STATUS_GROUPS).map(([k,g])=>{
          const cnt = k==="all"?leads.length:leads.filter(l=>STATUS_TO_GROUP[l.status]===k).length;
          return <button key={k} onClick={()=>{setFGroup(k);setPage(1);}} style={{padding:"4px 10px",borderRadius:20,border:`1px solid ${fGroup===k?g.c:T.border}`,background:fGroup===k?g.c+"33":"transparent",color:fGroup===k?g.c:T.muted,fontSize:9,fontWeight:fGroup===k?700:400,cursor:"pointer",display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:g.c,display:"inline-block"}}/>
            {g.label}
            <span style={{background:T.border+"88",borderRadius:8,padding:"0 4px",fontSize:8,color:T.muted}}>{cnt}</span>
          </button>;
        })}
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",background:T.card,border:`1px solid ${T.border}`,borderRadius:9,padding:"8px 10px",marginBottom:6}}>
        <div style={{position:"relative",flex:"0 0 200px"}}>
          <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:T.muted}}>{I.search}</span>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="ID, Ism, Tel, Izoh..." style={{...inpS,paddingLeft:24,fontSize:11}}/>
        </div>
        <select value={fCountry} onChange={e=>{setFC(e.target.value);setPage(1);}} style={{...inpS,width:"auto",fontSize:11}}><option value="">Mamlakat</option>{allCountries.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <select value={fSource} onChange={e=>{setFSrc(e.target.value);setPage(1);}} style={{...inpS,width:"auto",fontSize:11}}><option value="">Manba</option>{allSources.map(s=><option key={s} value={s}>{s}</option>)}</select>
        <select value={fOwner} onChange={e=>{setFOwner(e.target.value);setPage(1);}} style={{...inpS,width:"auto",fontSize:11}}><option value="">Mas'ul</option>{allOwners.map(o=><option key={o} value={o}>{o}</option>)}</select>
        <select value={fGender} onChange={e=>{setFG(e.target.value);setPage(1);}} style={{...inpS,width:"auto",fontSize:11}}><option value="">Jins</option><option value="Erkak">Erkak</option><option value="Ayol">Ayol</option></select>
        <div style={{display:"flex",gap:4,background:T.card2,border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 8px"}}>
          {[["Q1",fQ1,setFQ1,"#ec4899"],["Q2",fQ2,setFQ2,"#8b5cf6"],["Q3",fQ3,setFQ3,"#3b82f6"],["XBA",fXba,setFXba,"#f97316"]].map(([lb,v,sv,c])=>(
            <label key={lb} onClick={()=>{sv(!v);setPage(1);}} style={{display:"flex",alignItems:"center",gap:3,cursor:"pointer",fontSize:9,color:v?c:T.muted,fontWeight:v?700:400}}>
              <span style={{width:7,height:7,borderRadius:1,background:v?c:T.border+"88",border:`1px solid ${v?c:T.border}`,display:"inline-block"}}/>
              {lb}
            </label>
          ))}
        </div>
        <button onClick={resetFilters} style={{padding:"5px 10px",borderRadius:6,background:T.red+"22",color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:9,fontWeight:600}}>Tozalash</button>
        <span style={{marginLeft:"auto",fontSize:10,color:T.muted}}>{filtered.length} ta natija</span>
      </div>

      {/* Color legend */}
      <div style={{display:"flex",gap:10,marginBottom:6,flexWrap:"wrap"}}>
        {[["#22c55e","Tasdiqlangan / Jarayon"],["#ec4899","To'lov qilingan"],["#7c3aed","Vizaga topshirildi"],["#dc2626","Bekor / Rad etildi"],["#f59e0b","Aloqa bosqichi"],["#6366f1","Yangi lead"]].map(([c,l])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:T.muted}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:c,display:"inline-block"}}/>
            {l}
          </div>
        ))}
      </div>
    </div>

    {/* Table */}
    <div style={{flex:1,overflow:"auto",background:T.card,border:`1px solid ${T.border}`,borderRadius:10,minHeight:0}}>
      <table style={{width:"100%",borderCollapse:"separate",borderSpacing:0,fontSize:11}}>
        <thead>
          <tr>
            <th style={{padding:"9px 8px",textAlign:"left",fontSize:9,fontWeight:600,color:T.muted,textTransform:"uppercase",background:T.card2,borderBottom:`1px solid ${T.border}`,width:28}}>№</th>
            <SortTh col="id" label="№ ARIZA" w={100}/>
            <SortTh col="name" label="ISM" w={170}/>
            <SortTh col="status" label="HOLAT" w={150}/>
            <SortTh col="country" label="MAMLAKAT / SOHA" w={140}/>
            <th style={{padding:"9px 8px",fontSize:9,fontWeight:600,color:T.muted,textTransform:"uppercase",background:T.card2,borderBottom:`1px solid ${T.border}`,textAlign:"left"}}>MAS'UL</th>
            <th style={{padding:"9px 8px",fontSize:9,fontWeight:600,color:T.muted,textTransform:"uppercase",background:T.card2,borderBottom:`1px solid ${T.border}`,textAlign:"left"}}>TELEFON</th>
            <th style={{padding:"9px 8px",fontSize:9,fontWeight:600,color:T.muted,textTransform:"uppercase",background:T.card2,borderBottom:`1px solid ${T.border}`,textAlign:"left"}}>TO'LOV</th>
            <SortTh col="bal" label="MOLIYA" w={120}/>
            <th style={{padding:"9px 8px",fontSize:9,fontWeight:600,color:T.muted,textTransform:"uppercase",background:T.card2,borderBottom:`1px solid ${T.border}`,textAlign:"left",maxWidth:220}}>IZOH</th>
            <th style={{padding:"9px 8px",fontSize:9,fontWeight:600,color:T.muted,textTransform:"uppercase",background:T.card2,borderBottom:`1px solid ${T.border}`,textAlign:"left",width:40}}></th>
          </tr>
        </thead>
        <tbody>
          {pageData.map((l,i)=>{
            const sg = STATUS_TO_GROUP[l.status]||"contact";
            const sc = gS(l.status);
            let rowBg = "transparent";
            if(sg==="done") rowBg = T.dark?"rgba(22,101,52,0.15)":"rgba(22,101,52,0.05)";
            else if(sg==="lost") rowBg = T.dark?"rgba(127,29,29,0.12)":"rgba(220,38,38,0.04)";
            else if(sg==="payment") rowBg = T.dark?"rgba(236,72,153,0.1)":"rgba(236,72,153,0.04)";
            else if(sg==="visa") rowBg = T.dark?"rgba(124,58,237,0.1)":"rgba(124,58,237,0.04)";
            else if(sg==="deal") rowBg = T.dark?"rgba(22,163,74,0.08)":"rgba(22,163,74,0.03)";
            else if(sg==="docs") rowBg = T.dark?"rgba(59,130,246,0.08)":"rgba(59,130,246,0.03)";
            const od=tasks.filter(t=>t.leadId===l.id&&t.status!=="done"&&isOD(t.due)).length>0;
            const owners=[l.ownerSales,l.ownerConsult,l.ownerDocs].filter(Boolean).filter((v,j,a)=>a.indexOf(v)===j);
            return <tr key={l.id} onClick={()=>open(l)} style={{cursor:"pointer",background:rowBg}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(1.08)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>
              <td style={{padding:"8px 8px",color:T.muted,fontSize:9,borderBottom:`1px solid ${T.border}22`}}>{(page-1)*PER+i+1}</td>
              <td style={{padding:"8px 8px",borderBottom:`1px solid ${T.border}22`}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:sc.c,display:"inline-block",flexShrink:0}}/>
                  <span style={{color:T.accent,fontWeight:700,fontSize:10}}>{l.id}</span>
                </div>
              </td>
              <td style={{padding:"8px 8px",borderBottom:`1px solid ${T.border}22`,maxWidth:180}}>
                <div style={{fontWeight:600,color:T.text,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.name||"–"}{od&&<span style={{color:T.red,fontSize:9,marginLeft:4}}>⚠️</span>}</div>
                {l.telegram&&l.telegram!=="@"&&<div style={{fontSize:8,color:T.blue,marginTop:1}}>{l.telegram}</div>}
              </td>
              <td style={{padding:"8px 8px",borderBottom:`1px solid ${T.border}22`,whiteSpace:"nowrap"}}>
                <span style={{background:sc.c+"33",color:sc.c,border:`1px solid ${sc.c}44`,fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:20}}>{l.status}</span>
              </td>
              <td style={{padding:"8px 8px",borderBottom:`1px solid ${T.border}22`,maxWidth:140}}>
                <div style={{color:T.sub,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.country||"–"}</div>
                {l.sector&&<div style={{fontSize:8,color:T.muted,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.sector}</div>}
              </td>
              <td style={{padding:"8px 8px",borderBottom:`1px solid ${T.border}22`,maxWidth:120}}>
                {owners.length>0
                  ?<div style={{display:"flex",gap:2}}>{owners.map(id=><Av key={id} id={id} team={[]} size={16}/>)}</div>
                  :<span style={{color:T.muted,fontSize:9,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block",maxWidth:110}}>{l.owner?.split(",")[0]?.split(" - ")[0]||"–"}</span>
                }
              </td>
              <td style={{padding:"8px 8px",borderBottom:`1px solid ${T.border}22`,whiteSpace:"nowrap"}}>
                {l.phone?<a href={`tel:${l.phone}`} onClick={e=>e.stopPropagation()} style={{color:T.green,fontSize:10,textDecoration:"none",display:"flex",alignItems:"center",gap:3}}>{I.phone}{l.phone}</a>:<span style={{color:T.muted,fontSize:9}}>–</span>}
              </td>
              <td style={{padding:"8px 8px",borderBottom:`1px solid ${T.border}22`}}>
                <div style={{display:"flex",gap:2}}>
                  {[["Q1",l.q1,"#ec4899"],["Q2",l.q2,"#8b5cf6"],["Q3",l.q3,"#3b82f6"],["XBA",l.xba,"#f97316"]].map(([lb,v,c])=>(
                    <span key={lb} style={{fontSize:7,background:v?c+"33":T.card2+"88",color:v?c:T.border,border:`1px solid ${v?c+"55":T.border+"44"}`,borderRadius:3,padding:"0 3px",fontWeight:v?700:400}}>{lb}{v?"✓":""}</span>
                  ))}
                </div>
              </td>
              <td style={{padding:"8px 8px",borderBottom:`1px solid ${T.border}22`,whiteSpace:"nowrap"}}>
                {l.netBalance!==0
                  ?<div><span style={{fontSize:10,fontWeight:700,color:l.netBalance>0?T.green:T.red}}>{l.netBalance>0?"+":""}{fmtMs(l.netBalance)} so'm</span>
                  {(l.totalIncome||0)>0&&<div style={{fontSize:8,color:T.muted}}>{fmtMs(l.totalIncome||0)} / {fmtMs(l.totalExpense||0)}</div>}</div>
                  :<span style={{color:T.muted,fontSize:9}}>–</span>
                }
              </td>
              <td style={{padding:"8px 8px",borderBottom:`1px solid ${T.border}22`,maxWidth:200}}>
                <div style={{fontSize:9,color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={l.comment}>{l.comment||"–"}</div>
                {l.note&&<div style={{fontSize:8,color:T.cyan,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={l.note}>🔔 {l.note}</div>}
              </td>
              <td style={{padding:"8px 8px",borderBottom:`1px solid ${T.border}22`}} onClick={e=>{e.stopPropagation();open(l);}}>
                {perm.canEdit&&<button style={{padding:"2px 5px",borderRadius:4,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:9}}>{I.edit}</button>}
              </td>
            </tr>;
          })}
        </tbody>
      </table>
      {pageData.length===0&&<div style={{textAlign:"center",padding:"50px 0",color:T.muted,fontSize:13}}><div style={{fontSize:32,marginBottom:10}}>🔍</div>Mijoz topilmadi</div>}
    </div>

    {/* Pagination */}
    <div style={{flexShrink:0,padding:"8px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:10,color:T.muted}}>{filtered.length} dan {(page-1)*PER+1}–{Math.min(page*PER,filtered.length)} ko'rsatilmoqda</span>
      <div style={{display:"flex",gap:3}}>
        {["«","‹"].map((l,i)=><button key={l} onClick={()=>setPage(i===0?1:p=>Math.max(1,p-1))} disabled={page===1} style={{padding:"4px 8px",borderRadius:5,border:`1px solid ${T.border}`,background:T.card,color:T.muted,cursor:page===1?"default":"pointer",fontSize:10,opacity:page===1?.4:1}}>{l}</button>)}
        {Array.from({length:Math.min(7,totalPages)},(_,k)=>{const start=Math.max(1,Math.min(page-3,totalPages-6));const pg=start+k;if(pg>totalPages)return null;return<button key={pg} onClick={()=>setPage(pg)} style={{padding:"4px 8px",borderRadius:5,border:`1px solid ${pg===page?T.accent:T.border}`,background:pg===page?T.accent+"33":T.card,color:pg===page?T.accent:T.muted,cursor:"pointer",fontSize:10,fontWeight:pg===page?700:400,minWidth:26}}>{pg}</button>;})}
        {["›","»"].map((l,i)=><button key={l} onClick={()=>setPage(i===0?p=>Math.min(totalPages,p+1):totalPages)} disabled={page===totalPages} style={{padding:"4px 8px",borderRadius:5,border:`1px solid ${T.border}`,background:T.card,color:T.muted,cursor:page===totalPages?"default":"pointer",fontSize:10,opacity:page===totalPages?.4:1}}>{l}</button>)}
        <span style={{fontSize:9,color:T.muted,paddingLeft:4}}>{totalPages} sahifa</span>
      </div>
    </div>
  </div>;
}


// ─── TASKS PAGE ───────────────────────────────────────────────────────────────
function Tasks({tasks, setTasks, leads, user, team, roles}) {
  const T=useT();
  const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const PC={high:T.red,medium:T.yellow,low:T.green};
  const COLS={todo:{l:"📋 Bajarilmagan",c:T.accent},inprogress:{l:"⚡ Jarayonda",c:T.blue},done:{l:"✅ Bajarildi",c:T.green}};
  const perm=roles[user.role]||{};
  const mine=perm.canCfg?tasks:tasks.filter(t=>t.assignee===user.id||t.createdBy===user.id);
  const save=()=>{if(!form.title)return;setTasks(p=>p.some(t=>t.id===form.id)?p.map(t=>t.id===form.id?form:t):[...p,{...form,id:uid(),createdBy:user.id,at:new Date().toISOString()}]);setModal(null);};
  const inpS=inp(T); const labS=lab(T);
  const leadOpts=leads.map(l=>({value:l.id,label:l.name,id:l.id,phone:l.phone}));
  const teamOpts=team.filter(t=>t.role!=="partner"&&t.active!==false).map(t=>({value:t.id,label:t.name,id:t.id,phone:t.phone}));
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>Vazifalar</h1>
      <button onClick={()=>{setForm({title:"",desc:"",assignee:user.id,leadId:"",priority:"medium",status:"todo",due:""});setModal("form");}} style={{display:"flex",alignItems:"center",gap:4,padding:"7px 12px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>{I.plus} Qo'shish</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
      {Object.entries(COLS).map(([sk,sv])=>{
        const col=mine.filter(t=>t.status===sk).sort((a,b)=>new Date(a.due||"9999")-new Date(b.due||"9999"));
        return <div key={sk}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",background:`${sv.c}${T.dark?"22":"15"}`,border:`1px solid ${sv.c}44`,borderRadius:"8px 8px 0 0"}}>
            <span style={{fontSize:12,fontWeight:700,color:T.text}}>{sv.l}</span>
            <span style={{fontSize:11,fontWeight:700,background:`${sv.c}22`,color:sv.c,borderRadius:10,padding:"0 6px",border:`1px solid ${sv.c}44`}}>{col.length}</span>
          </div>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:"0 0 8px 8px",padding:7,minHeight:130}}>
            {col.map(t=>{const od=isOD(t.due)&&t.status!=="done"; const ds=isSoon(t.due)&&!od; const lead=leads.find(l=>l.id===t.leadId);
              return <div key={t.id} style={{background:T.card2,borderRadius:7,padding:8,marginBottom:5,border:`1px solid ${od?T.red+"44":ds?T.yellow+"44":T.border}`,borderLeft:`3px solid ${od?T.red:ds?T.yellow:PC[t.priority]||T.accent}`,cursor:"pointer"}} onClick={()=>{setForm({...t});setModal("form");}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:3,marginBottom:2}}><span style={{fontSize:11,fontWeight:600,color:T.text,textDecoration:t.status==="done"?"line-through":"none"}}>{t.title}</span><Av id={t.assignee} team={team} size={16}/></div>
                {t.desc&&<div style={{fontSize:9,color:T.muted,marginBottom:3}}>{t.desc}</div>}
                <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:8,color:PC[t.priority]||T.accent,fontWeight:700}}>{t.priority==="high"?"⚠️":t.priority==="low"?"📎":"📌"}</span>
                  {t.due&&<span style={{fontSize:8,color:od?T.red:ds?T.yellow:T.muted,fontWeight:od||ds?700:400}}>{fmtD(t.due)}{od?" ⚠️":ds?" ⏰":""}</span>}
                  {lead&&<span style={{fontSize:8,color:T.accent,background:`${T.accent}22`,borderRadius:3,padding:"0 3px"}}>{lead.name}</span>}
                </div>
              </div>;
            })}
            {col.length===0&&<div style={{color:T.border,fontSize:9,textAlign:"center",padding:12}}>–</div>}
          </div>
        </div>;
      })}
    </div>
    {modal==="form"&&<Modal onClose={()=>setModal(null)} width={440}>
      <div style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><h3 style={{margin:0,fontSize:13,fontWeight:800,color:T.text}}>Vazifa</h3><button onClick={()=>setModal(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted}}>{I.x}</button></div>
        <div style={{display:"grid",gap:8}}>
          <div><label style={labS}>Nomi *</label><input value={form.title||""} onChange={e=>f("title",e.target.value)} style={inpS}/></div>
          <div><label style={labS}>Tavsif</label><textarea value={form.desc||""} onChange={e=>f("desc",e.target.value)} rows={2} style={{...inpS,resize:"vertical"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><label style={labS}>Mas'ul</label><SearchSelect items={teamOpts} value={form.assignee||user.id} onChange={v=>f("assignee",Number(v))} placeholder="Mas'ul"/></div>
            <div><label style={labS}>Muhimlik</label><select value={form.priority||"medium"} onChange={e=>f("priority",e.target.value)} style={inpS}><option value="high">⚠️ Yuqori</option><option value="medium">📌 O'rta</option><option value="low">📎 Past</option></select></div>
            <div><label style={labS}>Holat</label><select value={form.status||"todo"} onChange={e=>f("status",e.target.value)} style={inpS}><option value="todo">Bajarilmagan</option><option value="inprogress">Jarayonda</option><option value="done">Bajarildi</option></select></div>
            <div><label style={labS}>Muddati</label><input type="date" value={form.due||""} onChange={e=>f("due",e.target.value)} style={inpS}/></div>
            <div style={{gridColumn:"1/-1"}}><label style={labS}>Bog'liq mijoz</label><SearchSelect items={[{value:"",label:"Umumiy vazifa",id:"",phone:""},...leads.map(l=>({value:l.id,label:l.name,id:l.id,phone:l.phone}))]} value={form.leadId||""} onChange={v=>f("leadId",v)} placeholder="Umumiy vazifa"/></div>
          </div>
        </div>
        <div style={{display:"flex",gap:7,justifyContent:"flex-end",marginTop:12}}>
          {tasks.some(t=>t.id===form.id)&&<button onClick={()=>{setTasks(p=>p.filter(t=>t.id!==form.id));setModal(null);}} style={{padding:"7px 10px",borderRadius:6,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:11,fontWeight:600}}>O'chirish</button>}
          <button onClick={()=>setModal(null)} style={{padding:"7px 12px",borderRadius:6,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11,fontWeight:600}}>Bekor</button>
          <button onClick={save} style={{padding:"7px 16px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11}}>Saqlash</button>
        </div>
      </div>
    </Modal>}
  </div>;
}

// ─── FINANCE ─────────────────────────────────────────────────────────────────
function Finance({leads, setLeads, team, user, txns, setTxns, config, addNotif}) {
  const T=useT();
  const [selLead,setSelLead]=useState(null); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const [search,setSearch]=useState(""); const [fView,setFView]=useState("all"); const [salaryTab,setSalaryTab]=useState(false);
  const fileRef=useRef(); const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const lf=(id)=>({inc:txns.filter(t=>t.leadId===id&&t.type==="income").reduce((s,t)=>s+t.amount,0),exp:txns.filter(t=>t.leadId===id&&t.type==="expense").reduce((s,t)=>s+t.amount,0),txns:txns.filter(t=>t.leadId===id)});
  const totalInc=txns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const totalExp=txns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const sofFoyda=leads.filter(l=>DONE.includes(l.status)&&l.sofFoyda).reduce((s,l)=>s+(l.sofFoyda||0),0);
  const visLeads=leads.filter(l=>{
    if(fView==="jarayon")return !DONE.includes(l.status)&&!LOST.includes(l.status);
    if(fView==="tugatilgan")return DONE.includes(l.status);
    if(fView==="yoqotilgan")return LOST.includes(l.status);
    return true;
  }).filter(l=>!search||l.name.toLowerCase().includes(search.toLowerCase())||l.id.includes(search));
  const cur=selLead?leads.find(l=>l.id===selLead):null; const cf=cur?lf(cur.id):{inc:0,exp:0,txns:[]};
  const markTugagan=(lead)=>{
    // Auto-set sofFoyda = current netBalance from transactions
    const cf=lf(lead.id);
    const autoSofFoyda=cf.inc-cf.exp;
    if(!window.confirm(`"${lead.name}" uchun Tugagan belgilansinmi?\nSof Foyda: ${fmtM(autoSofFoyda)} so'm`))return;
    setLeads(prev=>prev.map(l=>l.id===lead.id?{...l,status:"Jo'nab ketdi",sofFoyda:autoSofFoyda}:l));
    addNotif&&addNotif(`✅ ${lead.name} — Tugagan. Sof foyda: ${fmtMs(autoSofFoyda)} so'm`);
  };
  const openAdd=(type,leadId)=>{setForm({id:uid(),leadId:leadId||"",date:new Date().toISOString().slice(0,10),type:type||"income",cat:(type==="income"?config.txnInc:config.txnExp)[0],desc:"",amount:"",receipt:null});setModal("form");};
  const save=()=>{if(!form.desc||!form.amount)return;setTxns(p=>p.some(t=>t.id===form.id)?p.map(t=>t.id===form.id?{...form,amount:Number(form.amount)}:t):[...p,{...form,id:uid(),amount:Number(form.amount),by:user.id}]);setModal(null);};
  const exportCSV=()=>{const h=["ID","Sana","Tur","Kat","Tavsif","Summa","Mijoz"];const r=txns.map(t=>{const l=leads.find(x=>x.id===t.leadId);return[t.id,t.date,t.type,t.cat,t.desc,t.amount,l?.name||"–"];});const csv=[h,...r].map(x=>x.join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="moliya.csv";a.click();};
  const inpS=inp(T); const labS=lab(T);

  return <div style={{display:"flex",height:"calc(100vh - 52px)",overflow:"hidden"}}>
    {/* Left */}
    <div style={{width:250,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,background:T.card}}>
      <div style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:7}}>
          {[["Jami Kirim",totalInc,T.green,"+"],["Jami Chiqim",totalExp,T.red,"-"],["Joriy Balans",totalInc-totalExp,(totalInc-totalExp)>=0?T.green:T.red,(totalInc-totalExp)>=0?"+":"-"],["Sof Foyda",sofFoyda,T.yellow,"💰"]].map(([lb,val,c,sign])=>(
            <div key={lb} style={{background:`${c}12`,border:`1px solid ${c}33`,borderRadius:6,padding:"6px 8px"}}>
              <div style={{fontSize:8,color:T.muted,marginBottom:1,fontWeight:600}}>{lb}</div>
              <div style={{fontSize:11,fontWeight:800,color:c}}>{sign==="💰"?`${fmtMs(val)} so'm`:`${sign}${fmtMs(Math.abs(val))}`}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:4}}>
          <button onClick={exportCSV} style={{flex:1,padding:"4px",borderRadius:5,background:T.card2,color:T.muted,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:8}}>📥CSV</button>
          <button onClick={()=>openAdd("income",null)} style={{flex:1,padding:"4px",borderRadius:5,background:`${T.green}22`,color:T.green,border:`1px solid ${T.green}44`,cursor:"pointer",fontSize:8,fontWeight:700}}>+Kirim</button>
          <button onClick={()=>openAdd("expense",null)} style={{flex:1,padding:"4px",borderRadius:5,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:8,fontWeight:700}}>+Chiqim</button>
        </div>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${T.border}`}}>
        {[["all","Barchasi"],["jarayon","Jarayon"],["tugatilgan","Tugagan"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFView(k)} style={{flex:1,padding:"5px 2px",border:"none",borderBottom:fView===k?`2px solid ${T.accent}`:"2px solid transparent",background:"none",cursor:"pointer",fontSize:8,fontWeight:fView===k?700:400,color:fView===k?T.text:T.muted}}>{l}</button>
        ))}
      </div>
      <div style={{padding:"5px 7px"}}><div style={{position:"relative"}}><span style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",color:T.muted}}>{I.search}</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Qidirish..." style={{...inpS,paddingLeft:20,fontSize:10,padding:"5px 5px 5px 20px"}}/></div></div>
      <div style={{flex:1,overflowY:"auto"}}>
        {visLeads.map(l=>{const f2=lf(l.id);const bal=f2.inc-f2.exp;const sel=selLead===l.id;
          return <div key={l.id} onClick={()=>setSelLead(l.id)} style={{padding:"7px 10px",cursor:"pointer",borderBottom:`1px solid ${T.border}22`,background:sel?`${T.accent}22`:"transparent",borderLeft:sel?`3px solid ${T.accent}`:"3px solid transparent"}}>
            <div style={{fontSize:10,fontWeight:700,color:T.text,marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.name}</div>
            <div style={{fontSize:8,color:T.muted,marginBottom:2}}>{l.id} · {l.country||"–"}</div>
            <div style={{display:"flex",gap:6}}>
              <span style={{fontSize:9,fontWeight:700,color:bal>=0?T.green:T.red}}>{bal>=0?"+":""}{fmtMs(bal)}</span>
              {l.sofFoyda&&<span style={{fontSize:8,color:T.yellow}}>💰{fmtMs(l.sofFoyda)}</span>}
            </div>
          </div>;
        })}
      </div>
    </div>
    {/* Right */}
    <div style={{flex:1,overflowY:"auto",background:T.bg}}>
      {!cur&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:T.muted}}>
        <div style={{fontSize:44,marginBottom:12,opacity:.2}}>💰</div>
        <div style={{fontSize:13,color:T.text}}>Mijozni tanlang</div>
      </div>}
      {cur&&<div style={{padding:"18px 22px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
          <div>
            <div style={{fontSize:10,color:T.accent,fontWeight:700}}>{cur.id}</div>
            <h1 style={{fontSize:20,fontWeight:900,color:T.text,margin:"3px 0 5px",letterSpacing:"-0.03em"}}>{cur.name}</h1>
            <div style={{display:"flex",gap:6}}>{cur.country&&<span style={{background:T.card2,color:T.sub,fontSize:10,padding:"2px 8px",borderRadius:5,border:`1px solid ${T.border}`}}>✈️ {cur.country}</span>}<Pill sk={cur.status}/></div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={()=>openAdd("income",cur.id)} style={{padding:"6px 12px",borderRadius:7,background:`${T.green}22`,color:T.green,border:`1px solid ${T.green}44`,cursor:"pointer",fontSize:11,fontWeight:700}}>+ Kirim</button>
            <button onClick={()=>openAdd("expense",cur.id)} style={{padding:"6px 12px",borderRadius:7,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:11,fontWeight:700}}>+ Chiqim</button>
            {!DONE.includes(cur.status)&&<button onClick={()=>markTugagan(cur)} style={{padding:"6px 12px",borderRadius:7,background:"#166534",color:"#86EFAC",border:"1px solid #166534",cursor:"pointer",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>✈️ Tugagan</button>}
            {cur.sofFoyda&&<span style={{padding:"6px 10px",borderRadius:7,background:`${T.yellow}22`,color:T.yellow,border:`1px solid ${T.yellow}44`,fontSize:11,fontWeight:700}}>💰 {fmtMs(cur.sofFoyda)} so'm</span>}
          </div>
        </div>
        {/* 4 KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
          {[["💚 Jami Kirim",cf.inc,T.green],["🔴 Jami Chiqim",cf.exp,T.red],["⚖️ Joriy Balans",cf.inc-cf.exp,(cf.inc-cf.exp)>=0?T.green:T.red],["💰 Sof Foyda",cur.sofFoyda,T.yellow]].map(([lb,val,c])=>(
            <div key={lb} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:9,padding:"11px 13px",borderTop:`3px solid ${c}`}}>
              <div style={{fontSize:9,color:T.muted,marginBottom:4,fontWeight:600}}>{lb}</div>
              <div style={{fontSize:16,fontWeight:900,color:c}}>{val==null?"–":`${fmtM(Math.abs(val))} so'm`}</div>
              {lb.includes("Sof")&&!val&&<div style={{fontSize:8,color:T.muted,marginTop:2}}>Jo'nab ketganda</div>}
            </div>
          ))}
        </div>
        {[["income","💚 KIRIMLAR",T.green],["expense","🔴 CHIQIMLAR",T.red]].map(([type,title,c])=>{
          const items=cf.txns.filter(t=>t.type===type);
          return <div key={type} style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:700,color:c}}>{title} ({items.length})</span>
              <button onClick={()=>openAdd(type,cur.id)} style={{padding:"3px 9px",borderRadius:5,background:`${c}22`,color:c,border:`1px solid ${c}44`,cursor:"pointer",fontSize:10,fontWeight:700}}>+ Qo'shish</button>
            </div>
            {items.map(t=>(
              <div key={t.id} onClick={()=>{setForm({...t,amount:String(t.amount)});setModal("form");}} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 13px",marginBottom:4,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",borderLeft:`3px solid ${c}44`}}
                onMouseEnter={e=>e.currentTarget.style.borderLeft=`3px solid ${c}`} onMouseLeave={e=>e.currentTarget.style.borderLeft=`3px solid ${c}44`}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:c}}/>
                  <div><div style={{fontSize:12,fontWeight:600,color:T.text}}>{t.desc||t.cat}</div><div style={{fontSize:9,color:T.muted}}>{t.cat} · {t.date}</div></div>
                </div>
                <div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:800,color:c}}>{type==="income"?"+":"-"}{t.amount.toLocaleString()} so'm</div>{t.receipt&&<span style={{fontSize:8,color:T.green}}>📎</span>}</div>
              </div>
            ))}
            <button onClick={()=>openAdd(type,cur.id)} style={{width:"100%",padding:"7px",borderRadius:6,background:"transparent",color:T.muted,border:`1px dashed ${T.border}`,cursor:"pointer",fontSize:10}}>+ {type==="income"?"Kirim":"Chiqim"} qo'shish</button>
          </div>;
        })}
      </div>}
    </div>
    {modal==="form"&&<Modal onClose={()=>setModal(null)} width={420}>
      <div style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <h3 style={{margin:0,fontSize:13,fontWeight:800,color:T.text}}><span style={{color:form.type==="income"?T.green:T.red}}>{form.type==="income"?"💚 Kirim":"🔴 Chiqim"}</span></h3>
          <button onClick={()=>setModal(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted}}>{I.x}</button>
        </div>
        <div style={{display:"grid",gap:8}}>
          <div><label style={labS}>Turi</label><select value={form.type||"income"} onChange={e=>{f("type",e.target.value);f("cat",(e.target.value==="income"?config.txnInc:config.txnExp)[0]);}} style={inpS}><option value="income">💚 Kirim</option><option value="expense">🔴 Chiqim</option></select></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            <div><label style={labS}>Miqdor *</label><input type="number" value={form.amount||""} onChange={e=>f("amount",e.target.value)} style={inpS} placeholder="1000000"/></div>
            <div><label style={labS}>Sana</label><input type="date" value={form.date||""} onChange={e=>f("date",e.target.value)} style={inpS}/></div>
          </div>
          <div><label style={labS}>Kategoriya</label><select value={form.cat||""} onChange={e=>f("cat",e.target.value)} style={inpS}>{(form.type==="income"?config.txnInc:config.txnExp).map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={labS}>Izoh *</label><input value={form.desc||""} onChange={e=>f("desc",e.target.value)} style={inpS} placeholder="To'lov sababi..."/></div>
          <div><label style={labS}>Bog'liq mijoz</label><SearchSelect items={[{value:"",label:"–",id:"",phone:""},...leads.map(l=>({value:l.id,label:l.name,id:l.id,phone:l.phone}))]} value={form.leadId||""} onChange={v=>f("leadId",v)} placeholder="Tanlang"/></div>
          <div><label style={labS}>Kvitansiya</label>
            <input type="file" accept="image/*,.pdf" ref={fileRef} style={{display:"none"}} onChange={e=>{const fi=e.target.files[0];if(!fi)return;const r=new FileReader();r.onload=ev=>f("receipt",ev.target.result);r.readAsDataURL(fi);}}/>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <button onClick={()=>fileRef.current.click()} style={{padding:"5px 11px",borderRadius:6,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:10}}>{I.up} Yuklash</button>
              {form.receipt&&<><button onClick={()=>window.open(form.receipt,"_blank")} style={{fontSize:9,color:T.green,background:`${T.green}22`,border:`1px solid ${T.green}44`,borderRadius:4,padding:"2px 7px",cursor:"pointer"}}>📎 Ko'r</button><button onClick={()=>f("receipt",null)} style={{fontSize:9,color:T.red,background:`${T.red}22`,border:`1px solid ${T.red}44`,borderRadius:4,padding:"2px 7px",cursor:"pointer"}}>✕</button></>}
            </div>
            {form.receipt&&form.receipt.startsWith("data:image")&&<img src={form.receipt} alt="" style={{maxWidth:180,maxHeight:70,marginTop:5,borderRadius:5,border:`1px solid ${T.border}`,objectFit:"contain"}}/>}
          </div>
        </div>
        <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:12}}>
          {txns.some(t=>t.id===form.id)&&<button onClick={()=>{setTxns(p=>p.filter(t=>t.id!==form.id));setModal(null);}} style={{padding:"6px 10px",borderRadius:6,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:10,fontWeight:600}}>O'chirish</button>}
          <button onClick={()=>setModal(null)} style={{padding:"6px 12px",borderRadius:6,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11,fontWeight:600}}>Bekor</button>
          <button onClick={save} style={{padding:"6px 16px",borderRadius:6,background:form.type==="income"?T.green:T.red,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11}}>Qo'shish</button>
        </div>
      </div>
    </Modal>}
  </div>;
}
// ─── VISA, TEAM, SETTINGS (compact) ──────────────────────────────────────────
function Visa({user, roles}) {
  const T=useT(); const [visas,setVisas]=useState(INIT_VISA); const [sel,setSel]=useState(1); const [edit,setEdit]=useState(false); const [form,setForm]=useState(null);
  const canEdit=roles[user.role]?.canCfg; const cur=visas.find(v=>v.id===sel);
  const save=()=>{if(!form.country)return;const u={...form,docs:form.docsText.split("\n").map(s=>s.trim()).filter(Boolean)};delete u.docsText;setVisas(p=>p.some(v=>v.id===u.id)?p.map(v=>v.id===u.id?u:v):[...p,u]);setSel(u.id);setEdit(false);};
  const inpS=inp(T); const labS=lab(T);
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>Viza Ma'lumotlari</h1>
      {canEdit&&<button onClick={()=>{setForm({id:uid(),country:"",flag:"🌍",type:"",duration:"",docs:[],docsText:"",notes:""});setEdit(true);}} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 11px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>{I.plus} Qo'shish</button>}
    </div>
    <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>
      {visas.map(v=><button key={v.id} onClick={()=>setSel(v.id)} style={{padding:"5px 12px",borderRadius:7,border:`2px solid ${sel===v.id?T.accent:T.border}`,background:sel===v.id?`${T.accent}22`:"transparent",color:sel===v.id?T.text:T.muted,fontWeight:600,cursor:"pointer",fontSize:11}}>{v.flag} {v.country}</button>)}
    </div>
    {cur&&!edit&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <h3 style={{margin:0,fontSize:13,fontWeight:700,color:T.text}}>{cur.flag} {cur.country}</h3>
          {canEdit&&<div style={{display:"flex",gap:5}}>
            <button onClick={()=>{setForm({...cur,docsText:cur.docs.join("\n")});setEdit(true);}} style={{padding:"3px 8px",borderRadius:5,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:10,fontWeight:600}}>Tahrir</button>
            <button onClick={()=>setVisas(p=>p.filter(v=>v.id!==cur.id))} style={{padding:"3px 8px",borderRadius:5,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:10}}>✕</button>
          </div>}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          {[["Viza turi",cur.type,T.accent],["Muddati",cur.duration,T.green]].map(([lb,val,c])=>(
            <div key={lb} style={{flex:1,background:`${c}22`,border:`1px solid ${c}44`,borderRadius:6,padding:"7px 9px",textAlign:"center"}}><div style={{fontSize:9,color:T.muted}}>{lb}</div><div style={{fontSize:11,fontWeight:700,color:c,marginTop:2}}>{val}</div></div>
          ))}
        </div>
        {cur.docs.map((d,i)=><div key={i} style={{display:"flex",gap:6,padding:"5px 0",borderBottom:`1px solid ${T.border}22`}}><span style={{color:T.green,fontWeight:700}}>✓</span><span style={{color:T.text,fontSize:11}}>{d}</span></div>)}
      </div>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:16}}>
        {cur.notes&&<div style={{background:`${T.yellow}15`,border:`1px solid ${T.yellow}33`,borderRadius:7,padding:"9px 11px",marginBottom:10}}><div style={{fontSize:10,fontWeight:700,color:T.yellow,marginBottom:3}}>⚠️ Eslatma</div><p style={{color:T.text,fontSize:11,margin:0,lineHeight:1.6}}>{cur.notes}</p></div>}
        <h3 style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:T.text}}>📋 Bosqichlar</h3>
        {["Hujjatlar yig'ish","Shartnoma imzolash","XBA to'lovi","CV topshirish","Interview","Elchixona","Viza","Jo'nab ketish"].map((st,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${T.border}22`}}>
            <div style={{width:18,height:18,borderRadius:"50%",background:`${T.accent}22`,color:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,border:`1px solid ${T.accent}44`,flexShrink:0}}>{i+1}</div>
            <span style={{color:T.text,fontSize:11}}>{st}</span>
          </div>
        ))}
      </div>
    </div>}
    {edit&&form&&<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:18,maxWidth:540}}>
      <h3 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:T.text}}>{visas.some(v=>v.id===form.id)?"Tahrirlash":"Yangi"}</h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
        <div><label style={labS}>Bayroq</label><input value={form.flag||""} onChange={e=>setForm(p=>({...p,flag:e.target.value}))} style={inpS} placeholder="🇺🇿"/></div>
        <div><label style={labS}>Mamlakat *</label><input value={form.country||""} onChange={e=>setForm(p=>({...p,country:e.target.value}))} style={inpS}/></div>
        <div><label style={labS}>Viza turi</label><input value={form.type||""} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={inpS}/></div>
        <div><label style={labS}>Muddati</label><input value={form.duration||""} onChange={e=>setForm(p=>({...p,duration:e.target.value}))} style={inpS}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={labS}>Hujjatlar (satr-satr)</label><textarea value={form.docsText||""} onChange={e=>setForm(p=>({...p,docsText:e.target.value}))} rows={4} style={{...inpS,resize:"vertical"}}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={labS}>Izohlar</label><textarea value={form.notes||""} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} style={{...inpS,resize:"vertical"}}/></div>
      </div>
      <div style={{display:"flex",gap:7,marginTop:12}}>
        <button onClick={()=>setEdit(false)} style={{padding:"7px 13px",borderRadius:7,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11,fontWeight:600}}>Bekor</button>
        <button onClick={save} style={{padding:"7px 16px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11}}>💾 Saqlash</button>
      </div>
    </div>}
  </div>;
}

function TeamPage({user, team, setTeam, roles}) {
  const T=useT(); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const COLORS=["#6366f1","#22c55e","#f97316","#eab308","#ef4444","#06b6d4","#a855f7","#10b981","#3b82f6"];
  const save=()=>{if(!form.name||!form.username)return;setTeam(p=>p.some(t=>t.id===form.id)?p.map(t=>t.id===form.id?form:t):[...p,{...form,salItems:[]}]);setModal(null);};
  const inpS=inp(T); const labS=lab(T);
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>Jamoa</h1>
      {user.role==="admin"&&<button onClick={()=>{setForm({id:uid(),name:"",username:"",role:"sales",password:"",av:"",color:COLORS[0],phone:"",email:"",active:true,salary:0,salType:"fixed",pct:5,salItems:[]});setModal("form");}} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 11px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>{I.plus} Qo'shish</button>}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
      {team.map(m=>(
        <div key={m.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:13,display:"flex",gap:10,alignItems:"flex-start",opacity:m.active===false?.5:1}}>
          <Av id={m.id} team={team} size={34}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}><span style={{fontSize:13,fontWeight:700,color:T.text}}>{m.name}</span>{m.id===user.id&&<span style={{fontSize:8,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,borderRadius:3,padding:"0 4px",fontWeight:600}}>Siz</span>}</div>
            <div style={{fontSize:10,color:T.muted,marginBottom:4}}>@{m.username} · {m.phone}</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{background:`${roles[m.role]?.color||T.accent}22`,color:roles[m.role]?.color||T.accent,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20}}>{roles[m.role]?.label||m.role}</span>
              {(user.role==="admin"||user.role==="manager")&&<select value={m.role} onChange={e=>setTeam(p=>p.map(t=>t.id===m.id?{...t,role:e.target.value}:t))} style={{...inpS,width:"auto",fontSize:9,padding:"2px 5px"}}>{Object.keys(roles).map(r=><option key={r} value={r}>{roles[r].label}</option>)}</select>}
            </div>
            <div style={{fontSize:9,color:T.muted,marginTop:3}}>{m.salType==="fixed"?`Maosh: ${fmtMs(m.salary||0)} so'm`:`${m.pct||0}% komissiya`}</div>
          </div>
          {user.role==="admin"&&<div style={{display:"flex",gap:4,flexShrink:0}}>
            <button onClick={()=>{setForm({...m});setModal("form");}} style={{padding:"3px 6px",borderRadius:4,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:10}}>{I.edit}</button>
            {m.id!==user.id&&<button onClick={()=>setTeam(p=>p.map(t=>t.id===m.id?{...t,active:!t.active}:t))} style={{padding:"3px 6px",borderRadius:4,background:m.active===false?`${T.green}22`:`${T.yellow}22`,color:m.active===false?T.green:T.yellow,border:`1px solid ${m.active===false?T.green:T.yellow}44`,cursor:"pointer",fontSize:9}}>{m.active===false?"Faol":"To'xtat"}</button>}
          </div>}
        </div>
      ))}
    </div>
    {modal==="form"&&<Modal onClose={()=>setModal(null)} width={500}>
      <div style={{padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><h3 style={{margin:0,fontSize:13,fontWeight:800,color:T.text}}>Xodim</h3><button onClick={()=>setModal(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted}}>{I.x}</button></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <div style={{gridColumn:"1/-1"}}><label style={labS}>To'liq ismi *</label><input value={form.name||""} onChange={e=>f("name",e.target.value)} style={inpS}/></div>
          <div><label style={labS}>Username *</label><input value={form.username||""} onChange={e=>f("username",e.target.value)} style={inpS}/></div>
          <div><label style={labS}>Parol</label><input value={form.password||""} onChange={e=>f("password",e.target.value)} style={inpS}/></div>
          <div><label style={labS}>Telefon</label><input value={form.phone||""} onChange={e=>f("phone",e.target.value)} style={inpS}/></div>
          <div><label style={labS}>Rol</label><select value={form.role||"sales"} onChange={e=>f("role",e.target.value)} style={inpS}>{Object.entries(roles).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label style={labS}>Avatar (2 harf)</label><input value={form.av||""} onChange={e=>f("av",e.target.value.toUpperCase().slice(0,2))} maxLength={2} style={inpS} placeholder="AS"/></div>
          <div><label style={labS}>Maosh turi</label><select value={form.salType||"fixed"} onChange={e=>f("salType",e.target.value)} style={inpS}><option value="fixed">Fiksed</option><option value="percent">Foiz %</option></select></div>
          {form.salType==="fixed"?<div><label style={labS}>Oylik maosh</label><input type="number" value={form.salary||0} onChange={e=>f("salary",Number(e.target.value))} style={inpS}/></div>:<div><label style={labS}>Foiz %</label><input type="number" value={form.pct||5} onChange={e=>f("pct",Number(e.target.value))} style={inpS}/></div>}
          <div style={{gridColumn:"1/-1"}}><label style={labS}>Rang</label><div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:2}}>{COLORS.map(c=><div key={c} onClick={()=>f("color",c)} style={{width:20,height:20,borderRadius:"50%",background:c,cursor:"pointer",border:`3px solid ${form.color===c?T.text:"transparent"}`}}/>)}</div></div>
        </div>
        <div style={{display:"flex",gap:6,marginTop:12,justifyContent:"flex-end"}}>
          <button onClick={()=>setModal(null)} style={{padding:"7px 12px",borderRadius:6,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11,fontWeight:600}}>Bekor</button>
          <button onClick={save} style={{padding:"7px 16px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11}}>💾 Saqlash</button>
        </div>
      </div>
    </Modal>}
  </div>;
}

const ROLE_CAPS=[{key:"canOwner",label:"Mas'ulni o'zgartirish"},{key:"canFin",label:"Moliya bo'limi"},{key:"canEdit",label:"Lead tahrirlash"},{key:"canCfg",label:"Sozlamalar"},{key:"canTeam",label:"Jamoa boshqaruvi"},{key:"seeAll",label:"Barcha leadlarni ko'rish"},{key:"canTakeUnassigned",label:"Bo'sh leadni olish"}];

function Settings({user, config, setConfig, roles, setRoles}) {
  const T=useT(); const [tab,setTab]=useState("lists"); const [lt,setLt]=useState("countries"); const [ni,setNi]=useState(""); const [rf,setRf]=useState(null); const [rfm,setRfm]=useState({});
  const rfu=(k,v)=>setRfm(p=>({...p,[k]:v}));
  const ce=roles[user.role]?.canCfg; const isAdmin=user.role==="admin";
  const secs={countries:"Mamlakatlar",sectors:"Sohalar",sources:"Manbalar",positions:"Lavozimlar",txnInc:"Kirim kat.",txnExp:"Chiqim kat."};
  const addItem=(k)=>{if(!ni.trim())return;setConfig(p=>({...p,[k]:[...p[k],ni.trim()]}));setNi("");};
  const rmItem=(k,item)=>setConfig(p=>({...p,[k]:p[k].filter(x=>x!==item)}));
  const saveRole=()=>{if(!rfm.key||!rfm.label)return;setRoles(p=>({...p,[rfm.key]:{label:rfm.label,color:rfm.color||T.accent,...Object.fromEntries(ROLE_CAPS.map(c=>[c.key,!!rfm[c.key]]))}}));setRf(null);};
  const inpS=inp(T); const labS=lab(T);
  const RCOLS=["#6366f1","#22c55e","#f97316","#eab308","#ef4444","#06b6d4","#a855f7","#10b981"];
  return <div>
    <h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:"0 0 12px"}}>Sozlamalar</h1>
    <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>
      {[["lists","📋 Ro'yxatlar"],["roles","🔐 Rollar"],["integrations","🔗 Integratsiyalar"]].map(([k,l])=>(
        <button key={k} onClick={()=>setTab(k)} style={{padding:"6px 12px",borderRadius:7,border:`2px solid ${tab===k?T.accent:T.border}`,background:tab===k?`${T.accent}22`:"transparent",color:tab===k?T.text:T.muted,fontWeight:tab===k?700:400,cursor:"pointer",fontSize:11}}>{l}</button>
      ))}
    </div>
    {tab==="lists"&&ce&&<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:16}}>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {Object.entries(secs).map(([k,l])=><button key={k} onClick={()=>setLt(k)} style={{padding:"4px 10px",borderRadius:6,border:`2px solid ${lt===k?T.accent:T.border}`,background:lt===k?`${T.accent}22`:"transparent",color:lt===k?T.text:T.muted,fontWeight:lt===k?700:400,cursor:"pointer",fontSize:10}}>{l}</button>)}
      </div>
      <div style={{display:"flex",gap:7,marginBottom:10}}>
        <input value={ni} onChange={e=>setNi(e.target.value)} placeholder={`Yangi ${secs[lt]}...`} style={{...inpS,flex:1}} onKeyDown={e=>e.key==="Enter"&&addItem(lt)}/>
        <button onClick={()=>addItem(lt)} style={{padding:"7px 14px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11}}>+</button>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {(config[lt]||[]).map(item=>(
          <div key={item} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:20,background:T.card2,border:`1px solid ${T.border}`,fontSize:11,color:T.text}}>
            {item}<button onClick={()=>rmItem(lt,item)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:13,lineHeight:1,padding:0,marginLeft:2}}>{I.x}</button>
          </div>
        ))}
      </div>
    </div>}
    {tab==="roles"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <h3 style={{margin:0,fontSize:12,fontWeight:700,color:T.text}}>Rollar</h3>
        {isAdmin&&<button onClick={()=>{setRfm({key:"",label:"",color:T.accent,...Object.fromEntries(ROLE_CAPS.map(c=>[c.key,false]))});setRf("form");}} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,fontSize:10,border:"none",cursor:"pointer"}}>{I.plus} Yangi rol</button>}
      </div>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{borderBottom:`1px solid ${T.border}`,background:T.card2}}>
            <th style={{textAlign:"left",padding:"8px 10px",color:T.muted,fontSize:9,textTransform:"uppercase",fontWeight:600}}>Rol</th>
            {ROLE_CAPS.map(c=><th key={c.key} style={{textAlign:"center",padding:"8px 5px",color:T.muted,fontSize:9,textTransform:"uppercase",fontWeight:600,maxWidth:70}}>{c.label}</th>)}
            <th style={{padding:"8px 10px",color:T.muted,fontSize:9}}></th>
          </tr></thead>
          <tbody>
            {Object.entries(roles).map(([key,role])=>(
              <tr key={key} style={{borderBottom:`1px solid ${T.border}22`}}>
                <td style={{padding:"8px 10px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:role.color}}/><span style={{fontSize:11,fontWeight:600,color:T.text}}>{role.label}</span><span style={{fontSize:8,color:T.muted,fontFamily:"monospace"}}>{key}</span></div>
                </td>
                {ROLE_CAPS.map(c=>(
                  <td key={c.key} style={{textAlign:"center",padding:"8px 5px"}}>
                    {isAdmin?<input type="checkbox" checked={!!role[c.key]} onChange={e=>setRoles(p=>({...p,[key]:{...p[key],[c.key]:e.target.checked}}))} style={{accentColor:role.color,width:13,height:13}}/>
                    :<span style={{color:role[c.key]?T.green:T.border,fontSize:12}}>{role[c.key]?"✓":"–"}</span>}
                  </td>
                ))}
                <td style={{padding:"8px 10px"}}>
                  {isAdmin&&<div style={{display:"flex",gap:3}}>
                    <button onClick={()=>{setRfm({key,label:role.label,color:role.color,...Object.fromEntries(ROLE_CAPS.map(c=>[c.key,!!role[c.key]]))});setRf("form");}} style={{padding:"2px 6px",borderRadius:4,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:9}}>{I.edit}</button>
                    {!["admin","manager","sales","partner"].includes(key)&&<button onClick={()=>{const r={...roles};delete r[key];setRoles(r);}} style={{padding:"2px 6px",borderRadius:4,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:9}}>{I.trash}</button>}
                  </div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>}
    {tab==="integrations"&&<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
        {[["Tally Forms","tally.so → Make → Webhook","Yangi arizalar avtomatik","#6366f1"],["Meta Leads","Facebook Lead Ads → Make","Reklama leadlari","#1d4ed8"],["MicroSIP","tel: link → SIP qo'ng'iroq","Telefon tugmasiga bosing","#22c55e"],["Make / Zapier","Webhook: POST /api/leads","Barcha integratsiyalar","#f97316"],["Google Sheets","CSV export","Hisobotlar uchun","#16a34a"],["WhatsApp","+wa link","Tezkor muloqot","#25D366"]].map(([t,api,d,c])=>(
          <div key={t} style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:10,borderLeft:`3px solid ${c}`}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:2}}>{t}</div>
            <div style={{fontSize:9,color:c,marginBottom:3,fontFamily:"monospace"}}>{api}</div>
            <div style={{fontSize:9,color:T.muted}}>{d}</div>
          </div>
        ))}
      </div>
    </div>}
    {rf==="form"&&<Modal onClose={()=>setRf(null)} width={480}>
      <div style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><h3 style={{margin:0,fontSize:13,fontWeight:800,color:T.text}}>Rol</h3><button onClick={()=>setRf(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted}}>{I.x}</button></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
          <div><label style={labS}>Kalit</label><input value={rfm.key||""} onChange={e=>rfu("key",e.target.value.toLowerCase().replace(/\s/g,"_"))} style={inpS} placeholder="my_role"/></div>
          <div><label style={labS}>Nom</label><input value={rfm.label||""} onChange={e=>rfu("label",e.target.value)} style={inpS}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={labS}>Rang</label><div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:2}}>{RCOLS.map(c=><div key={c} onClick={()=>rfu("color",c)} style={{width:20,height:20,borderRadius:"50%",background:c,cursor:"pointer",border:`3px solid ${rfm.color===c?T.text:"transparent"}`}}/>)}</div></div>
        </div>
        <div style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:11,marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:T.text,marginBottom:8}}>Ruxsatlar</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {ROLE_CAPS.map(cap=>(
              <label key={cap.key} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:11,color:T.text}}>
                <input type="checkbox" checked={!!rfm[cap.key]} onChange={e=>rfu(cap.key,e.target.checked)} style={{width:14,height:14,accentColor:rfm.color||T.accent}}/>{cap.label}
              </label>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
          <button onClick={()=>setRf(null)} style={{padding:"7px 12px",borderRadius:6,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11,fontWeight:600}}>Bekor</button>
          <button onClick={saveRole} style={{padding:"7px 15px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11}}>💾 Saqlash</button>
        </div>
      </div>
    </Modal>}
  </div>;
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({user, pg, go, logout, notif, roles, dark, setDark, col, setCol}) {
  const T=useT();
  const NAV=[
    {k:"dashboard",l:"Dashboard",  ic:I.dash},
    {k:"pipeline", l:"Pipeline",   ic:I.pipe},
    {k:"leads",    l:"Mijozlar",   ic:I.list},
    {k:"tasks",    l:"Vazifalar",  ic:I.task},
    {k:"finance",  l:"Moliya",     ic:I.money},
    {k:"salary",   l:"Xodimlar Xarajat",ic:I.salary},
    {k:"empreport",l:"Xodim Hisobot",ic:I.report},
    {k:"docspipe",  l:"Hujjatchi Pipeline",ic:I.flag},
    {k:"debts",     l:"Qarzlar",           ic:I.money},
    {k:"visa",     l:"Viza",       ic:I.flag},
    {k:"team",     l:"Jamoa",      ic:I.team},
    {k:"settings", l:"Sozlamalar", ic:I.gear},
  ];
  const allowed={admin:NAV.map(n=>n.k),manager:["dashboard","pipeline","leads","tasks","visa","team","settings","empreport","debts"],sales:["dashboard","pipeline","leads","tasks"],docs:["dashboard","leads","tasks","docspipe"],partner:["leads"]};
  const perm=roles[user.role]||{};
  let vis=NAV.filter(n=>(allowed[user.role]||[]).includes(n.k));
  if(!perm.canFin){vis=vis.filter(n=>n.k!=="finance"&&n.k!=="salary"&&n.k!=="empreport"&&n.k!=="debts");}
  const W=col?54:196;
  return <div style={{width:W,background:T.card,borderRight:`1px solid ${T.border}`,minHeight:"100vh",display:"flex",flexDirection:"column",flexShrink:0,transition:"width 0.2s ease",overflow:"hidden"}}>
    <div style={{padding:col?"14px 0":"15px 13px 11px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:col?"center":"flex-start",gap:col?0:8}}>
      <span style={{fontSize:20,flexShrink:0}}>✈️</span>
      {!col&&<div><div style={{color:T.text,fontWeight:900,fontSize:13}}>OneJobs</div><div style={{color:T.accent,fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>CRM v7</div></div>}
    </div>
    <button onClick={()=>setCol(c=>!c)} style={{margin:"6px auto",width:col?34:30,height:20,borderRadius:10,background:T.card2,border:`1px solid ${T.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.muted,transition:"all 0.2s",flexShrink:0}}>
      <span style={{display:"inline-block",transform:col?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}}>{I.chev}</span>
    </button>
    <nav style={{padding:col?"4px":"7px 6px",flex:1}}>
      {vis.map(({k,l,ic})=>(
        <button key={k} onClick={()=>go(k)} title={col?l:""} style={{width:"100%",display:"flex",alignItems:"center",gap:col?0:7,padding:col?"9px 0":"7px 9px",borderRadius:7,marginBottom:1,cursor:"pointer",border:"none",textAlign:"left",background:pg===k?`${T.accent}22`:"transparent",color:pg===k?T.accent:T.muted,fontWeight:pg===k?700:400,fontSize:11,justifyContent:col?"center":"flex-start",position:"relative"}}>
          <span style={{color:pg===k?T.accent:T.muted,flexShrink:0}}>{ic}</span>
          {!col&&<span style={{color:pg===k?T.text:T.muted}}>{l}</span>}
          {k==="tasks"&&notif>0&&<span style={{position:col?"absolute":undefined,top:col?2:undefined,right:col?2:undefined,marginLeft:col?0:"auto",background:T.red,color:"#fff",borderRadius:10,fontSize:7,fontWeight:700,padding:"0 3px",minWidth:14,textAlign:"center"}}>{notif}</span>}
        </button>
      ))}
    </nav>
    <div style={{padding:col?"7px 4px":"9px 9px 12px",borderTop:`1px solid ${T.border}`}}>
      <button onClick={()=>setDark(d=>!d)} title={dark?"Light":"Dark"} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:col?"center":"flex-start",gap:col?0:7,padding:col?"7px 0":"6px 9px",borderRadius:7,background:T.card2,border:`1px solid ${T.border}`,cursor:"pointer",color:T.muted,marginBottom:6,fontSize:10}}>
        <span>{dark?I.sun:I.moon}</span>{!col&&<span>{dark?"Light":"Dark"}</span>}
      </button>
      {col?<div style={{display:"flex",justifyContent:"center",marginBottom:6}}><Av id={user.id} team={[user]} size={28}/></div>
        :<div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
          <Av id={user.id} team={[user]} size={26}/>
          <div style={{minWidth:0}}><div style={{color:T.text,fontSize:10,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div><div style={{color:roles[user.role]?.color||T.muted,fontSize:8,fontWeight:600}}>{roles[user.role]?.label}</div></div>
        </div>}
      <button onClick={logout} title="Chiqish" style={{width:"100%",display:"flex",alignItems:"center",justifyContent:col?"center":"flex-start",gap:col?0:5,padding:col?"7px 0":"6px",borderRadius:7,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:10,fontWeight:600}}>
        {I.logout}{!col&&"Chiqish"}
      </button>
    </div>
  </div>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({onLogin, team, roles}) {
  const T=mkT(true);
  const [u,su]=useState(""); const [p,sp]=useState(""); const [e,se]=useState("");
  const go=()=>{const x=team.find(t=>t.username===u&&t.password===p&&t.active!==false);x?onLogin(x):se("Login yoki parol noto'g'ri");};
  const inpS={...inp(T),marginBottom:0};
  return <ThemeCtx.Provider value={T}>
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,width:400,padding:36,boxShadow:"0 0 60px rgba(99,102,241,.15)"}}>
        <div style={{textAlign:"center",marginBottom:28}}><div style={{fontSize:38,marginBottom:8}}>✈️</div>
          <h1 style={{fontSize:22,fontWeight:900,color:"#fff",margin:0,letterSpacing:"-0.04em"}}>OneJobs CRM</h1>
          <p style={{color:T.muted,margin:"4px 0 0",fontSize:11}}>Xalqaro mehnat agentligi · v7</p>
        </div>
        <div style={{marginBottom:11}}><label style={{color:T.muted,fontSize:10,fontWeight:600,display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.05em"}}>Login</label><input value={u} onChange={ev=>su(ev.target.value)} onKeyDown={ev=>ev.key==="Enter"&&go()} style={inpS} placeholder="username"/></div>
        <div style={{marginBottom:14}}><label style={{color:T.muted,fontSize:10,fontWeight:600,display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.05em"}}>Parol</label><input value={p} onChange={ev=>sp(ev.target.value)} type="password" onKeyDown={ev=>ev.key==="Enter"&&go()} style={inpS} placeholder="••••••••"/></div>
        {e&&<p style={{color:T.red,fontSize:11,marginBottom:10,textAlign:"center"}}>{e}</p>}
        <button onClick={go} style={{width:"100%",padding:"10px",borderRadius:8,background:T.accent,color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer",marginBottom:18}}>Kirish →</button>
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:14}}>
          <p style={{color:T.muted,fontSize:9,textAlign:"center",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Tez kirish</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
            {team.map(x=>(
              <div key={x.id} onClick={()=>{su(x.username);sp(x.password);}} style={{cursor:"pointer",padding:"6px 9px",borderRadius:7,border:`1px solid ${T.border}`,background:T.card2,display:"flex",alignItems:"center",gap:6}}>
                <Av id={x.id} team={team} size={18}/>
                <div><div style={{fontSize:10,fontWeight:600,color:T.text}}>{x.name}</div><div style={{fontSize:8,color:roles[x.role]?.color||T.muted,fontWeight:600}}>{roles[x.role]?.label||x.role}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </ThemeCtx.Provider>;
}

// ─── APP ──────────────────────────────────────────────────────────────────────

// ─── SALARY PAGE (like image) ──────────────────────────────────────────────
function SalaryPage({team, setTeam, txns, setTxns, user}) {
  const T=useT();
  const [month,setMonth]=useState("2026-05");
  const [expanded,setExpanded]=useState(null);
  const [addForm,setAddForm]=useState({});
  const inpS=inp(T);

  const calcSalary=(u)=>{
    const mInc=txns.filter(t=>t.type==="income"&&t.date.startsWith(month)&&t.by===u.id).reduce((s,t)=>s+t.amount,0);
    const base=u.salType==="fixed"?u.salItems.reduce((s,it)=>s+it.amount,0):Math.round(mInc*(u.pct||0)/100);
    const extra=txns.filter(t=>t.type==="expense"&&t.by===1&&t.date.startsWith(month)&&(t.desc?.includes(u.name)||t.cat==="Maosh"||t.cat==="Avans")).reduce((s,t)=>s+t.amount,0);
    return {base, extra, total:base+extra, mInc};
  };
  const allSalary=team.filter(t=>t.active!==false&&t.role!=="partner");
  const totalSal=allSalary.reduce((s,u)=>s+calcSalary(u).total,0);
  const avgSal=allSalary.length>0?Math.round(totalSal/allSalary.length):0;

  const addSalItem=(uid)=>{
    if(!addForm[uid]?.label||!addForm[uid]?.amount)return;
    setTeam(prev=>prev.map(u=>u.id===uid?{...u,salItems:[...(u.salItems||[]),{id:Date.now(),label:addForm[uid].label,amount:Number(addForm[uid].amount)}]}:u));
    setAddForm(p=>({...p,[uid]:{label:"",amount:""}}));
  };
  const removeSalItem=(uid,itemId)=>setTeam(prev=>prev.map(u=>u.id===uid?{...u,salItems:(u.salItems||[]).filter(it=>it.id!==itemId)}:u));
  const updateSalItem=(uid,itemId,k,v)=>setTeam(prev=>prev.map(u=>u.id===uid?{...u,salItems:(u.salItems||[]).map(it=>it.id===itemId?{...it,[k]:k==="amount"?Number(v):v}:it)}:u));

  const exportCSV=()=>{
    const rows=allSalary.map(u=>{const cal=calcSalary(u);return[u.name,u.role,u.salType==="fixed"?"Fiksed":`${u.pct}%`,fmtM(cal.base),fmtM(cal.total)].join(",");});
    const csv=[["Ism","Rol","Tur","Asosiy","Jami"].join(","),...rows].join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`maosh-${month}.csv`;a.click();
  };

  return <div>
    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>Xodimlar Xarajatlari</h1>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{...inpS,width:"auto"}}/>
        <button onClick={exportCSV} style={{padding:"7px 13px",borderRadius:7,background:T.card2,color:T.muted,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:4}}>📥 CSV</button>
      </div>
    </div>
    {/* Summary */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
      <StatCard icon="💸" label="Bu oy xarajat" value={`${fmtMs(totalSal)} so'm`}/>
      <StatCard icon="🗓️" label="Barcha vaqt" value={`${fmtMs(txns.filter(t=>t.type==="expense"&&["Maosh","Avans"].includes(t.cat)).reduce((s,t)=>s+t.amount,0))} so'm`}/>
      <StatCard icon="👥" label="Xodimlar soni" value={allSalary.length}/>
      <StatCard icon="📊" label="O'rtacha (bu oy)" value={`${fmtMs(avgSal)} so'm`}/>
    </div>
    {/* Employee cards */}
    {allSalary.map(u=>{
      const cal=calcSalary(u); const isExp=expanded===u.id;
      return <div key={u.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,marginBottom:10,overflow:"hidden"}}>
        {/* Collapsed row */}
        <div onClick={()=>setExpanded(isExp?null:u.id)} style={{padding:"13px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Av id={u.id} team={team} size={34}/>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:T.text}}>{u.name}</div>
              <div style={{fontSize:10,color:T.muted}}>{INIT_ROLES[u.role]?.label||u.role}</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:T.muted,marginBottom:2}}>Bu oy</div>
            <div style={{fontSize:14,fontWeight:800,color:cal.total>0?T.red:T.muted}}>{cal.total>0?`-${fmtMs(cal.total)} so'm`:"–"}</div>
          </div>
        </div>
        {/* Expanded */}
        {isExp&&<div style={{borderTop:`1px solid ${T.border}`,padding:"14px 16px"}}>
          {/* Salary items */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:8}}>Maosh elementlari</div>
            {(u.salItems||[]).map(item=>(
              <div key={item.id} style={{display:"flex",gap:8,alignItems:"center",padding:"7px 10px",background:T.card2,borderRadius:7,marginBottom:5,border:`1px solid ${T.border}`}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:T.red,flexShrink:0}}/>
                <input value={item.label} onChange={e=>updateSalItem(u.id,item.id,"label",e.target.value)} style={{...inpS,flex:2,padding:"4px 7px",fontSize:11}} placeholder="Xarajat nomi"/>
                <input type="number" value={item.amount} onChange={e=>updateSalItem(u.id,item.id,"amount",e.target.value)} style={{...inpS,flex:1,padding:"4px 7px",fontSize:11}} placeholder="Miqdor"/>
                <span style={{fontSize:11,color:T.red,fontWeight:600,flexShrink:0,minWidth:60,textAlign:"right"}}>{month}-01</span>
                <span style={{fontSize:11,color:T.red,fontWeight:700,flexShrink:0,minWidth:70,textAlign:"right"}}>-{fmtMs(item.amount)} so'm</span>
                <button onClick={()=>removeSalItem(u.id,item.id)} style={{background:`${T.red}22`,border:`1px solid ${T.red}44`,borderRadius:5,padding:"4px 6px",cursor:"pointer",color:T.red}}>🗑 O'chirish</button>
              </div>
            ))}
            {/* Add row */}
            <div style={{display:"flex",gap:8,alignItems:"center",padding:"7px 10px",background:`${T.accent}11`,borderRadius:7,border:`1px dashed ${T.accent}44`}}>
              <input value={(addForm[u.id]||{}).label||""} onChange={e=>setAddForm(p=>({...p,[u.id]:{...(p[u.id]||{}),label:e.target.value}}))} style={{...inpS,flex:2,padding:"4px 7px",fontSize:11}} placeholder="Xarajat nomi (Maosh, Bonus...)"/>
              <input type="number" value={(addForm[u.id]||{}).amount||""} onChange={e=>setAddForm(p=>({...p,[u.id]:{...(p[u.id]||{}),amount:e.target.value}}))} style={{...inpS,flex:1,padding:"4px 7px",fontSize:11}} placeholder="Miqdor"/>
              <button onClick={()=>addSalItem(u.id)} style={{padding:"5px 12px",borderRadius:6,background:T.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:700}}>+ Qo'shish</button>
            </div>
          </div>
          {/* Tahrirlash / O'chirish buttons */}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setExpanded(null)} style={{padding:"6px 14px",borderRadius:7,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:11,fontWeight:600}}>✏️ Tahrirlash</button>
            <button onClick={()=>{if(window.confirm(`${u.name} ni o'chirasizmi?`))setTeam(p=>p.filter(t=>t.id!==u.id));}} style={{padding:"6px 14px",borderRadius:7,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:11,fontWeight:600}}>🗑 O'chirish</button>
          </div>
        </div>}
      </div>;
    })}
  </div>;
}

// ─── EMPLOYEE REPORT ──────────────────────────────────────────────────────────
function EmpReport({leads, tasks, team, user}) {
  const T=useT();
  const [period,setPeriod]=useState("month");
  const [dateFrom,setDateFrom]=useState(""); const [dateTo,setDateTo]=useState("");
  const [selEmp,setSelEmp]=useState(0);
  const teamOpts=team.filter(t=>t.active!==false&&t.role!=="partner").map(t=>({value:t.id,label:t.name,id:t.id,phone:t.phone}));

  const inRange=(d)=>{
    if(period==="custom"&&dateFrom&&dateTo){const dt=new Date(d);return dt>=new Date(dateFrom)&&dt<=new Date(dateTo);}
    return dateRange(d,period==="custom"?"month":period);
  };

  const empData=team.filter(t=>t.active!==false&&t.role!=="partner"&&(!selEmp||t.id===selEmp)).map(u=>{
    const myLeads=leads.filter(l=>l.ownerSales===u.id||l.ownerConsult===u.id||l.ownerDocs===u.id);
    const changes=leads.flatMap(l=>(l.history||[]).filter(h=>h.by===u.id&&inRange(h.at)).map(h=>({...h,leadId:l.id,leadName:l.name})));
    const periodLeads=myLeads.filter(l=>inRange(l.createdAt));
    const donePeriod=myLeads.filter(l=>DONE.includes(l.status)&&inRange(l.createdAt));
    const tasksDone=tasks.filter(t=>t.assignee===u.id&&t.status==="done"&&inRange(t.at));
    const tasksTotal=tasks.filter(t=>t.assignee===u.id&&inRange(t.at));
    const kpiGiven=leads.filter(l=>(l.ownerSales===u.id&&l.kpiSales)||(l.ownerConsult===u.id&&l.kpiConsult)||(l.ownerDocs===u.id&&l.kpiDocs));
    return {u, myLeads:myLeads.length, periodLeads:periodLeads.length, done:donePeriod.length, changes:changes.length, tasksDone:tasksDone.length, tasksTotal:tasksTotal.length, kpi:kpiGiven.length, changeLog:changes};
  });

  const inpS=inp(T);
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>Xodimlar Hisoboti</h1>
    </div>
    {/* Filters */}
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:9,padding:"10px 12px",marginBottom:12,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <SearchSelect items={[{value:0,label:"Barcha xodimlar",id:"",phone:""},...teamOpts]} value={selEmp} onChange={v=>setSelEmp(Number(v))} placeholder="Barcha xodimlar"/>
      <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inpS,width:"auto"}}>
        <option value="today">Bugun</option>
        <option value="week">Bu hafta</option>
        <option value="month">Bu oy</option>
        <option value="custom">Maxsus</option>
      </select>
      {period==="custom"&&<>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...inpS,width:"auto"}}/>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{...inpS,width:"auto"}}/>
      </>}
    </div>
    {/* Summary cards */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
      <StatCard icon="👥" label="Jami leadlar" value={empData.reduce((s,x)=>s+x.myLeads,0)}/>
      <StatCard icon="✈️" label="Jo'nab ketdi" value={empData.reduce((s,x)=>s+x.done,0)} color={T.green}/>
      <StatCard icon="📝" label="O'zgartirishlar" value={empData.reduce((s,x)=>s+x.changes,0)} color={T.accent}/>
      <StatCard icon="⭐" label="KPI berildi" value={empData.reduce((s,x)=>s+x.kpi,0)} color={T.yellow}/>
    </div>
    {/* Per employee */}
    {empData.map(({u,myLeads,periodLeads,done,changes,tasksDone,tasksTotal,kpi,changeLog})=>(
      <div key={u.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:16,marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <Av id={u.id} team={team} size={36}/>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.text}}>{u.name}</div>
            <div style={{fontSize:10,color:T.muted}}>{INIT_ROLES[u.role]?.label||u.role}</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:12}}>
          {[["Jami lead",myLeads,T.accent],["Davr leadi",periodLeads,T.blue],["Jo'nab ketdi",done,T.green],["O'zgarishlar",changes,T.purple],["Vazifalar",`${tasksDone}/${tasksTotal}`,T.yellow],["KPI",kpi,T.cyan]].map(([lb,val,c])=>(
            <div key={lb} style={{background:`${c}15`,border:`1px solid ${c}33`,borderRadius:7,padding:"8px 10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:T.muted,marginBottom:2}}>{lb}</div>
              <div style={{fontSize:14,fontWeight:800,color:c}}>{val}</div>
            </div>
          ))}
        </div>
        {/* Change log */}
        {changeLog.length>0&&<div>
          <div style={{fontSize:10,fontWeight:700,color:T.muted,marginBottom:6,textTransform:"uppercase"}}>O'zgartirishlar tarixi ({changeLog.length})</div>
          {changeLog.slice(0,5).map((ch,i)=>(
            <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${T.border}22`}}>
              <div style={{fontSize:9,color:T.muted,flexShrink:0,width:60}}>{fmtD(ch.at)}</div>
              <div style={{fontSize:10,color:T.accent,flexShrink:0}}>{ch.leadName}</div>
              <div style={{fontSize:10,color:T.text}}>{ch.text}</div>
            </div>
          ))}
          {changeLog.length>5&&<div style={{fontSize:10,color:T.muted,marginTop:4}}>+ yana {changeLog.length-5} ta...</div>}
        </div>}
      </div>
    ))}
  </div>;
}
// ─── DOCS PIPELINE ───────────────────────────────────────────────────────────
function DocsPipeline({leads, tasks, team, user, open, config, roles, setLeads}) {
  const T=useT();
  const perm=roles[user.role]||{};
  const INIT_DOC_STAGES = [
    {id:"ds1",label:"Hujjatlar Yig'ilmoqda",c:"#3b82f6"},
    {id:"ds2",label:"Pasport Olinmoqda",c:"#6366f1"},
    {id:"ds3",label:"CV Tayyorlanmoqda",c:"#8b5cf6"},
    {id:"ds4",label:"Diplom Tasdiqlanmoqda",c:"#a855f7"},
    {id:"ds5",label:"Tibbiy Tekshiruv",c:"#0891b2"},
    {id:"ds6",label:"Elchixona Uchun Tayyor",c:"#d97706"},
    {id:"ds7",label:"Vizaga Topshirildi",c:"#7c3aed"},
    {id:"ds8",label:"Viza Kutilmoqda",c:"#4f46e5"},
    {id:"ds9",label:"Viza Oldi",c:"#15803d"},
    {id:"ds10",label:"Jo'nab Ketdi",c:"#166534"},
  ];
  const [docStages,setDocStages] = useState(()=>{
    try{return JSON.parse(localStorage.getItem("onejobs_doc_stages"))||INIT_DOC_STAGES;}
    catch{return INIT_DOC_STAGES;}
  });
  const saveStages = (s) => {
    setDocStages(s);
    try{localStorage.setItem("onejobs_doc_stages",JSON.stringify(s));}catch{}
  };
  const [search,setSearch]=useState("");
  const [editStages,setEditStages]=useState(false);
  const [stageForm,setStageForm]=useState({});
  const [editingId,setEditingId]=useState(null);
  const [dragStage,setDragStage]=useState(null);
  const [dragOver,setDragOver]=useState(null);
  const inpS=inp(T); const labS=lab(T);

  // Leads in docs stages (filter by status containing doc-related or use custom stage mapping)
  const DOC_STATUS_MAP = {
    "Hujjatlar Tayyorlanmoqda":"ds1",
    "Hujjatlar Jonatilishga Tayyor":"ds6",
    "Hujjatlar Jonatildi":"ds6",
    "Ish shartnomasi keldi":"ds5",
    "Ish shartnomasi imzolandi":"ds5",
    "Taklifnoma keldi":"ds8",
    "Elchixonaga Hujjatlar Tayyor":"ds6",
    "Vizaga Topshirildi":"ds7",
    "Viza Oldi":"ds9",
    "Jo'nab ketdi":"ds10",
  };
  const flt=leads.filter(l=>{
    const inDocStage = Object.keys(DOC_STATUS_MAP).includes(l.status);
    const hasDocsOwner = l.ownerDocs != null;
    if(!inDocStage && !hasDocsOwner) return false;
    if(search&&!l.name.toLowerCase().includes(search.toLowerCase())&&!l.phone?.includes(search)&&!l.id.includes(search))return false;
    return true;
  });
  const grp={};
  docStages.forEach(s=>{
    grp[s.id]=flt.filter(l=>{
      const mapped = DOC_STATUS_MAP[l.status];
      return mapped===s.id||(l.docsStage===s.id);
    });
  });

  const addStage=()=>{
    if(!stageForm.label)return;
    const ns={id:"ds"+Date.now(),label:stageForm.label,c:stageForm.c||"#3b82f6"};
    saveStages([...docStages,ns]);
    setStageForm({});
  };
  const deleteStage=(id)=>{if(window.confirm("O'chirilsinmi?"))saveStages(docStages.filter(s=>s.id!==id));};
  const updateStage=(id,k,v)=>saveStages(docStages.map(s=>s.id===id?{...s,[k]:v}:s));
  const moveStageUp=(idx)=>{if(idx===0)return;const a=[...docStages];[a[idx-1],a[idx]]=[a[idx],a[idx-1]];saveStages(a);};
  const moveStageDown=(idx)=>{if(idx===docStages.length-1)return;const a=[...docStages];[a[idx+1],a[idx]]=[a[idx],a[idx+1]];saveStages(a);};

  // Drag-drop for stage reorder
  const handleDragStart=(e,id)=>{setDragStage(id);e.dataTransfer.effectAllowed="move";};
  const handleDragOver=(e,id)=>{e.preventDefault();setDragOver(id);};
  const handleDrop=(e,targetId)=>{
    e.preventDefault();
    if(!dragStage||dragStage===targetId)return;
    const arr=[...docStages];
    const fromIdx=arr.findIndex(s=>s.id===dragStage);
    const toIdx=arr.findIndex(s=>s.id===targetId);
    const [moved]=arr.splice(fromIdx,1);arr.splice(toIdx,0,moved);
    saveStages(arr);setDragStage(null);setDragOver(null);
  };
  const COLORS=["#3b82f6","#6366f1","#8b5cf6","#a855f7","#06b6d4","#10b981","#22c55e","#f59e0b","#f97316","#ef4444","#0d9488","#7c3aed","#d97706","#15803d","#166534"];

  return <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 52px)",overflow:"hidden"}}>
    {/* Header */}
    <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,background:T.card,flexShrink:0,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
      <div>
        <h1 style={{fontSize:17,fontWeight:900,color:T.text,margin:0}}>📁 Hujjatchi Pipeline</h1>
        <p style={{color:T.muted,margin:"1px 0 0",fontSize:10}}>{flt.length} ta mijoz · {docStages.length} ta bosqich</p>
      </div>
      <div style={{marginLeft:"auto",display:"flex",gap:7,alignItems:"center"}}>
        <div style={{position:"relative"}}><span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:T.muted}}>{I.search}</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Qidirish..." style={{...inpS,paddingLeft:23,width:150,fontSize:11}}/></div>
        <button onClick={()=>setEditStages(e=>!e)} style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${editStages?T.accent:T.border}`,background:editStages?`${T.accent}22`:"transparent",color:editStages?T.accent:T.muted,cursor:"pointer",fontSize:11,fontWeight:editStages?700:400}}>⚙️ Bosqichlarni tahrirlash</button>
      </div>
    </div>

    {/* Stage editor */}
    {editStages&&<div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,background:T.card2,flexShrink:0,maxHeight:280,overflowY:"auto"}}>
      <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:8}}>Bosqichlarni boshqarish (tortib o'rin almashtiring)</div>
      {docStages.map((s,idx)=>(
        <div key={s.id} draggable onDragStart={e=>handleDragStart(e,s.id)} onDragOver={e=>handleDragOver(e,s.id)} onDrop={e=>handleDrop(e,s.id)}
          style={{display:"flex",gap:6,alignItems:"center",padding:"6px 8px",marginBottom:4,background:dragOver===s.id?`${T.accent}22`:T.card,border:`1px solid ${dragOver===s.id?T.accent:T.border}`,borderRadius:7,cursor:"grab",borderLeft:`3px solid ${s.c}`}}>
          <span style={{color:T.muted,fontSize:11,cursor:"grab"}}>⠿</span>
          <span style={{width:12,height:12,borderRadius:"50%",background:s.c,flexShrink:0}}/>
          {editingId===s.id
            ?<><input value={s.label} onChange={e=>updateStage(s.id,"label",e.target.value)} style={{...inpS,flex:1,padding:"3px 6px",fontSize:11}} autoFocus/>
               <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                 {COLORS.map(c=><div key={c} onClick={()=>updateStage(s.id,"c",c)} style={{width:14,height:14,borderRadius:"50%",background:c,cursor:"pointer",border:`2px solid ${s.c===c?T.text:"transparent"}`}}/>)}
               </div>
               <button onClick={()=>setEditingId(null)} style={{padding:"2px 7px",borderRadius:4,background:T.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:9,fontWeight:700}}>✓</button>
            </>
            :<><span style={{flex:1,fontSize:11,color:T.text}}>{s.label}</span>
               <span style={{fontSize:9,color:T.muted}}>{grp[s.id]?.length||0} ta</span>
             </>
          }
          <button onClick={()=>moveStageUp(idx)} disabled={idx===0} style={{padding:"1px 5px",borderRadius:3,background:T.card2,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:9,opacity:idx===0?0.3:1}}>↑</button>
          <button onClick={()=>moveStageDown(idx)} disabled={idx===docStages.length-1} style={{padding:"1px 5px",borderRadius:3,background:T.card2,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:9,opacity:idx===docStages.length-1?0.3:1}}>↓</button>
          <button onClick={()=>setEditingId(editingId===s.id?null:s.id)} style={{padding:"2px 5px",borderRadius:3,background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,cursor:"pointer",fontSize:9}}>{I.edit}</button>
          <button onClick={()=>deleteStage(s.id)} style={{padding:"2px 5px",borderRadius:3,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:9}}>{I.trash}</button>
        </div>
      ))}
      {/* Add new stage */}
      <div style={{display:"flex",gap:6,alignItems:"center",marginTop:8,padding:"6px 8px",background:`${T.accent}11`,borderRadius:7,border:`1px dashed ${T.accent}44`}}>
        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
          {COLORS.slice(0,8).map(c=><div key={c} onClick={()=>setStageForm(p=>({...p,c}))} style={{width:14,height:14,borderRadius:"50%",background:c,cursor:"pointer",border:`2px solid ${stageForm.c===c?T.text:"transparent"}`}}/>)}
        </div>
        <input value={stageForm.label||""} onChange={e=>setStageForm(p=>({...p,label:e.target.value}))} placeholder="Yangi bosqich nomi..." style={{...inpS,flex:1,padding:"5px 8px",fontSize:11}} onKeyDown={e=>e.key==="Enter"&&addStage()}/>
        <button onClick={addStage} style={{padding:"5px 12px",borderRadius:6,background:T.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:700}}>+ Qo'shish</button>
      </div>
    </div>}

    {/* Kanban board */}
    <div style={{flex:1,overflowX:"auto",overflowY:"hidden",padding:"12px 16px"}}>
      <div style={{display:"flex",gap:8,height:"100%",alignItems:"flex-start"}}>
        {docStages.map(stage=>{
          const cards=grp[stage.id]||[];
          return <div key={stage.id} style={{minWidth:200,maxWidth:200,flexShrink:0,height:"calc(100vh - 200px)",display:"flex",flexDirection:"column"}}>
            <div style={{background:`${stage.c}${T.dark?"22":"15"}`,border:`1px solid ${stage.c}44`,borderRadius:"8px 8px 0 0",padding:"6px 8px",display:"flex",justifyContent:"space-between",flexShrink:0}}>
              <span style={{fontSize:10,fontWeight:700,color:stage.c,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:150}}>{stage.label}</span>
              <span style={{fontSize:9,fontWeight:800,background:`${stage.c}22`,color:stage.c,borderRadius:10,padding:"0 5px",border:`1px solid ${stage.c}44`,flexShrink:0}}>{cards.length}</span>
            </div>
            <div style={{background:T.dark?`${T.card}bb`:T.card2,border:`1px solid ${stage.c}22`,borderTop:"none",borderRadius:"0 0 8px 8px",padding:5,flex:1,overflowY:"auto"}}>
              {cards.map(lead=>{
                const lt=tasks.filter(t=>t.leadId===lead.id&&t.status!=="done"); const od=lt.some(t=>isOD(t.due));
                const hasDocs=lead.docs&&Object.values(lead.docs).some(v=>v);
                return <div key={lead.id} onClick={()=>open(lead)} style={{background:T.card,borderRadius:7,padding:"8px 9px",marginBottom:4,cursor:"pointer",border:`1px solid ${T.border}`,borderLeft:`3px solid ${stage.c}66`}}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow=T.shadow} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                  <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.name}</div>
                  {lead.phone&&<div style={{fontSize:9,color:T.cyan,marginBottom:2,display:"flex",alignItems:"center",gap:3}}>{I.phone} {lead.phone}</div>}
                  <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:3}}>
                    {lead.country&&<span style={{fontSize:8,background:T.card2,color:T.muted,borderRadius:3,padding:"0 4px",border:`1px solid ${T.border}`}}>🌍{lead.country}</span>}
                    {hasDocs&&<span style={{fontSize:8,background:`${T.green}22`,color:T.green,borderRadius:3,padding:"0 3px"}}>📎 hujjatlar</span>}
                    {lead.kpiDocs&&<span style={{fontSize:8,background:`${T.cyan}22`,color:T.cyan,borderRadius:3,padding:"0 3px",fontWeight:700}}>KPI₃</span>}
                  </div>
                  <div style={{display:"flex",gap:3,alignItems:"center"}}>
                    {lt.length>0&&<span style={{fontSize:8,color:od?T.red:T.green,fontWeight:700}}>✓{lt.length}{od&&"⚠"}</span>}
                    <Pill sk={lead.status}/>
                  </div>
                  <div style={{fontSize:8,color:T.muted,marginTop:2}}>#{lead.id}</div>
                </div>;
              })}
              {cards.length===0&&<div style={{textAlign:"center",padding:"10px 0",color:T.border,fontSize:9}}>–</div>}
            </div>
          </div>;
        })}
      </div>
    </div>
  </div>;
}

// ─── DEBTS PAGE ───────────────────────────────────────────────────────────────
function DebtsPage({debts, setDebts, team, user, config}) {
  const T=useT();
  const [tab,setTab]=useState("client"); // client | company
  const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const inpS=inp(T); const labS=lab(T);

  const clientDebts = debts.filter(d=>d.type==="client");
  const companyDebts = debts.filter(d=>d.type==="company");
  const totalClientDebt = clientDebts.reduce((s,d)=>s+(d.amount||0),0);
  const totalCompanyDebt = companyDebts.reduce((s,d)=>s+(d.amount||0),0);
  const totalClientPaid = clientDebts.filter(d=>d.paid).reduce((s,d)=>s+(d.amount||0),0);
  const totalCompanyPaid = companyDebts.filter(d=>d.paid).reduce((s,d)=>s+(d.amount||0),0);

  const addDebt=()=>{
    if(!form.name||!form.amount)return;
    setDebts(p=>[...p,{...form,id:uid(),amount:Number(form.amount),paid:false,createdAt:new Date().toISOString().slice(0,10),by:user.id}]);
    setModal(null);
  };
  const togglePaid=(id)=>setDebts(p=>p.map(d=>d.id===id?{...d,paid:!d.paid}:d));
  const deleteDebt=(id)=>setDebts(p=>p.filter(d=>d.id!==id));
  const exportCSV=()=>{
    const h=["ID","Tur","Ism","Tavsif","Summa","Sana","Holat"];
    const rows=debts.map(d=>[d.id,d.type==="client"?"Mijoz qarzi":"Kompaniya qarzi",d.name,d.desc||"",d.amount,d.dueDate||"",d.paid?"To'langan":"Qarzdor"].join(",")).join("\n");
    const blob=new Blob([h.join(",")+"\n"+rows],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="qarzlar.csv";a.click();
  };

  const DebtCard=({debt})=>(
    <div style={{background:T.card,border:`1px solid ${debt.paid?T.green+"44":T.border}`,borderRadius:9,padding:"12px 14px",marginBottom:7,borderLeft:`3px solid ${debt.paid?T.green:T.red}`,opacity:debt.paid?0.7:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
            <span style={{fontSize:13,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{debt.name}</span>
            {debt.paid&&<span style={{fontSize:9,background:`${T.green}22`,color:T.green,border:`1px solid ${T.green}44`,borderRadius:10,padding:"0 6px",fontWeight:700}}>✓ To'langan</span>}
            {!debt.paid&&debt.dueDate&&isOD(debt.dueDate)&&<span style={{fontSize:9,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,borderRadius:10,padding:"0 6px",fontWeight:700}}>⚠️ Muddati o'tgan</span>}
          </div>
          {debt.desc&&<div style={{fontSize:10,color:T.muted,marginBottom:3}}>{debt.desc}</div>}
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            {debt.category&&<span style={{fontSize:9,background:T.card2,color:T.sub,border:`1px solid ${T.border}`,borderRadius:4,padding:"1px 6px"}}>{debt.category}</span>}
            {debt.dueDate&&<span style={{fontSize:9,color:isOD(debt.dueDate)?T.red:T.muted}}>📅 Muddat: {fmtD(debt.dueDate)}</span>}
            <span style={{fontSize:9,color:T.muted}}>Kiritildi: {debt.createdAt}</span>
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
          <div style={{fontSize:16,fontWeight:900,color:debt.paid?T.green:T.red,marginBottom:4}}>{fmtM(debt.amount)} so'm</div>
          <div style={{display:"flex",gap:5,justifyContent:"flex-end"}}>
            <button onClick={()=>togglePaid(debt.id)} style={{padding:"4px 9px",borderRadius:5,background:debt.paid?`${T.yellow}22`:`${T.green}22`,color:debt.paid?T.yellow:T.green,border:`1px solid ${debt.paid?T.yellow+"44":T.green+"44"}`,cursor:"pointer",fontSize:9,fontWeight:600}}>{debt.paid?"Qaytarish":"✓ To'landi"}</button>
            <button onClick={()=>deleteDebt(debt.id)} style={{padding:"4px 7px",borderRadius:5,background:`${T.red}22`,color:T.red,border:`1px solid ${T.red}44`,cursor:"pointer",fontSize:9}}>{I.trash}</button>
          </div>
        </div>
      </div>
    </div>
  );

  return <div>
    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
      <div>
        <h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>Qarzlar Boshqaruvi</h1>
        <p style={{color:T.muted,margin:"1px 0 0",fontSize:10}}>Mijoz qarzlari va kompaniya majburiyatlari</p>
      </div>
      <div style={{display:"flex",gap:7}}>
        <button onClick={exportCSV} style={{padding:"7px 12px",borderRadius:7,background:T.card,color:T.muted,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11,fontWeight:600}}>📥 CSV</button>
        <button onClick={()=>{setForm({type:tab,category:"",dueDate:"",desc:""});setModal("form");}} style={{display:"flex",alignItems:"center",gap:4,padding:"7px 12px",borderRadius:7,background:T.accent,color:"#fff",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>{I.plus} Qarz qo'shish</button>
      </div>
    </div>

    {/* Summary cards */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
      {[
        ["👤 Mijoz qarzlari",totalClientDebt,T.red,"Jami"],
        ["✓ Mijoz to'langan",totalClientPaid,T.green,"To'langan"],
        ["🏢 Kompaniya qarzi",totalCompanyDebt,T.yellow,"Jami"],
        ["✓ Kompaniya to'langan",totalCompanyPaid,T.green,"To'langan"],
      ].map(([lb,val,c,sub])=>(
        <div key={lb} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 13px",borderTop:`3px solid ${c}`}}>
          <div style={{fontSize:9,color:T.muted,marginBottom:4,fontWeight:600}}>{lb}</div>
          <div style={{fontSize:16,fontWeight:900,color:c}}>{fmtM(val)} so'm</div>
          <div style={{fontSize:8,color:T.muted}}>{sub}</div>
        </div>
      ))}
    </div>

    {/* Risk summary */}
    <div style={{background:`${T.red}12`,border:`1px solid ${T.red}33`,borderRadius:9,padding:"10px 14px",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:T.red,marginBottom:4}}>⚠️ Muddati o'tgan qarzlar</div>
          <div style={{fontSize:18,fontWeight:900,color:T.red}}>{fmtM([...clientDebts,...companyDebts].filter(d=>!d.paid&&d.dueDate&&isOD(d.dueDate)).reduce((s,d)=>s+(d.amount||0),0))} so'm</div>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:T.yellow,marginBottom:4}}>📋 To'lanmagan jami</div>
          <div style={{fontSize:18,fontWeight:900,color:T.yellow}}>{fmtM(([...clientDebts,...companyDebts].filter(d=>!d.paid).reduce((s,d)=>s+(d.amount||0),0)))} so'm</div>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:T.green,marginBottom:4}}>✓ Jami to'langan</div>
          <div style={{fontSize:18,fontWeight:900,color:T.green}}>{fmtM(totalClientPaid+totalCompanyPaid)} so'm</div>
        </div>
      </div>
    </div>

    {/* Tabs */}
    <div style={{display:"flex",gap:0,marginBottom:12,background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:3,width:"fit-content"}}>
      {[["client","👤 Mijoz qarzlari",clientDebts.length],["company","🏢 Kompaniya qarzi",companyDebts.length]].map(([k,l,n])=>(
        <button key={k} onClick={()=>setTab(k)} style={{padding:"6px 16px",borderRadius:6,border:"none",background:tab===k?T.accent:"transparent",color:tab===k?"#fff":T.muted,cursor:"pointer",fontSize:11,fontWeight:tab===k?700:400,display:"flex",alignItems:"center",gap:5}}>
          {l} <span style={{background:tab===k?"rgba(255,255,255,0.3)":T.border,borderRadius:10,padding:"0 5px",fontSize:9,fontWeight:700}}>{n}</span>
        </button>
      ))}
    </div>

    {/* Debt list */}
    <div>
      {(tab==="client"?clientDebts:companyDebts).length===0
        ?<div style={{textAlign:"center",padding:"40px 0",color:T.muted,fontSize:13}}><div style={{fontSize:32,marginBottom:8}}>💰</div>Qarz yo'q ✅</div>
        :(tab==="client"?clientDebts:companyDebts)
            .sort((a,b)=>(!a.paid&&b.paid)?-1:(a.paid&&!b.paid)?1:0)
            .map(d=><DebtCard key={d.id} debt={d}/>)
      }
    </div>

    {/* Modal */}
    {modal==="form"&&<Modal onClose={()=>setModal(null)} width={440}>
      <div style={{padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
          <h3 style={{margin:0,fontSize:13,fontWeight:800,color:T.text}}>Yangi qarz</h3>
          <button onClick={()=>setModal(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted}}>{I.x}</button>
        </div>
        <div style={{display:"grid",gap:9}}>
          <div><label style={labS}>Tur</label>
            <select value={form.type||"client"} onChange={e=>f("type",e.target.value)} style={inpS}>
              <option value="client">👤 Mijoz qarzi (bizga qarzdor)</option>
              <option value="company">🏢 Kompaniya qarzi (biz qarzdormiz)</option>
            </select></div>
          <div><label style={labS}>Ism / Kompaniya nomi *</label><input value={form.name||""} onChange={e=>f("name",e.target.value)} style={inpS} placeholder="Mijoz yoki hamkor nomi"/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><label style={labS}>Miqdor (so'm) *</label><input type="number" value={form.amount||""} onChange={e=>f("amount",e.target.value)} style={inpS} placeholder="1000000"/></div>
            <div><label style={labS}>Muddat</label><input type="date" value={form.dueDate||""} onChange={e=>f("dueDate",e.target.value)} style={inpS}/></div>
          </div>
          <div><label style={labS}>Kategoriya</label>
            <select value={form.category||""} onChange={e=>f("category",e.target.value)} style={inpS}>
              <option value="">– Tanlang</option>
              {form.type==="client"
                ?["1-Qism","2-Qism","3-Qism","XBA To'lov","Konsultatsiya","Hujjat xizmati","Boshqa"].map(c=><option key={c}>{c}</option>)
                :["Hamkor to'lovi","Hujjat xizmati","Elchixona xizmati","Tarjimon","Tibbiy","Reklama","Maosh","Ofis ijara","Boshqa"].map(c=><option key={c}>{c}</option>)
              }
            </select></div>
          <div><label style={labS}>Tavsif</label><textarea value={form.desc||""} onChange={e=>f("desc",e.target.value)} rows={2} style={{...inpS,resize:"vertical"}} placeholder="Qarz sababi..."/></div>
        </div>
        <div style={{display:"flex",gap:7,justifyContent:"flex-end",marginTop:14}}>
          <button onClick={()=>setModal(null)} style={{padding:"7px 12px",borderRadius:6,background:T.card2,color:T.text,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11,fontWeight:600}}>Bekor</button>
          <button onClick={addDebt} style={{padding:"7px 16px",borderRadius:6,background:T.accent,color:"#fff",fontWeight:700,border:"none",cursor:"pointer",fontSize:11}}>💾 Qo'shish</button>
        </div>
      </div>
    </Modal>}
  </div>;
}

// ─── SUPER DASHBOARD v2 (Business KPI) ────────────────────────────────────────
function Dashboard({leads, tasks, user, team, txns, roles}) {
  const T=useT();
  const total=leads.length;
  const gone=leads.filter(l=>DONE.includes(l.status)).length;
  const myT=tasks.filter(t=>t.assignee===user.id&&t.status!=="done");
  const perm=roles[user.role]||{};
  const totalInc=txns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const totalExp=txns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const sofF=leads.filter(l=>DONE.includes(l.status)&&l.sofFoyda).reduce((s,l)=>s+(l.sofFoyda||0),0);

  // Funnel analytics with conversion %
  const funnelGroups=[
    ["Yangi",["Yangi","Qilindi"]],
    ["Aloqa",["Bog'landi","Boglanildi","Onlayn Suhbat Uchun","Onlayn Suhbat","Suhbat"]],
    ["Bitim",["Shartnoma qildi","XBA To'lov qildi","CV Topshirildi","Interview ga qo'yildi","Ishga qabul qilindi"]],
    ["To'lov",["1 - Qism To'landi"]],
    ["Hujjatlar",["Hujjatlar Tayyorlanmoqda","Hujjatlar Jonatilishga Tayyor","Hujjatlar Jonatildi","Ish shartnomasi keldi","Ish shartnomasi imzolandi","Taklifnoma keldi"]],
    ["Viza",["Elchixonaga Hujjatlar Tayyor","Vizaga Topshirildi","Viza Oldi"]],
    ["Jo'nab ketdi",["Jo'nab ketdi"]],
  ];
  const fData=funnelGroups.map(([g,stages])=>({g,n:leads.filter(l=>stages.includes(l.status)).length}));

  // Source analytics with revenue
  const bySrc=Object.entries(leads.reduce((m,l)=>{if(l.source){m[l.source]=(m[l.source]||{count:0,contracts:0,gone:0,revenue:0});m[l.source].count++;if(["Shartnoma qildi",...DONE].some(s=>l.status.includes(s)))m[l.source].contracts++;if(DONE.includes(l.status))m[l.source].gone++;m[l.source].revenue+=(l.totalIncome||0);}return m;},{})).sort(([,a],[,b])=>b.count-a.count).slice(0,8);

  // Country analytics with revenue
  const byCon=Object.entries(leads.reduce((m,l)=>{if(l.country){const c=l.country.split(",")[0].trim();m[c]=(m[c]||{count:0,gone:0,revenue:0});m[c].count++;if(DONE.includes(l.status))m[c].gone++;m[c].revenue+=(l.totalIncome||0);}return m;},{})).sort(([,a],[,b])=>b.count-a.count).slice(0,6);

  // Team stats
  const teamStats=team.filter(t=>["sales","manager","docs"].includes(t.role)).map(t=>{
    const myLeads=leads.filter(l=>l.ownerSales===t.id||l.ownerConsult===t.id||l.ownerDocs===t.id);
    const myGone=myLeads.filter(l=>DONE.includes(l.status)).length;
    const conv=myLeads.length>0?((myGone/myLeads.length)*100).toFixed(0):0;
    const kpi=leads.filter(l=>(l.ownerSales===t.id&&l.kpiSales)||(l.ownerConsult===t.id&&l.kpiConsult)||(l.ownerDocs===t.id&&l.kpiDocs)).length;
    const inc=txns.filter(x=>x.type==="income"&&leads.find(l=>l.id===x.leadId&&(l.ownerSales===t.id||l.ownerConsult===t.id||l.ownerDocs===t.id))).reduce((s,x)=>s+x.amount,0);
    return {t,total:myLeads.length,gone:myGone,conv,kpi,inc};
  }).filter(x=>x.total>0).sort((a,b)=>b.gone-a.gone);

  // Alerts
  const overdueTask=tasks.filter(t=>t.status!=="done"&&isOD(t.due)).length;
  const soonTask=tasks.filter(t=>t.status!=="done"&&isSoon(t.due)).length;
  const lostLeads=leads.filter(l=>LOST.includes(l.status)).length;
  const activeLeads=leads.filter(l=>![...DONE,...LOST].includes(l.status)).length;
  const contractLeads=leads.filter(l=>l.status==="Shartnoma qildi").length;
  const visaLeads=leads.filter(l=>["Vizaga Topshirildi","Elchixonaga Hujjatlar Tayyor"].includes(l.status)).length;

  // KPIs
  const thisMonthLeads=leads.filter(l=>l.createdAt&&new Date(l.createdAt)>new Date(new Date().getFullYear(),new Date().getMonth(),1)).length;
  const contactRate=total>0?((leads.filter(l=>!["Yangi","Qilindi"].includes(l.status)).length/total)*100).toFixed(0):0;
  const contractRate=total>0?((contractLeads/total)*100).toFixed(1):0;
  const deployRate=total>0?((gone/total)*100).toFixed(1):0;
  const avgRev=gone>0?Math.round(totalInc/gone):0;

  // Monthly chart
  const months=["01","02","03","04","05"];
  const mInc=months.map(m=>txns.filter(t=>t.type==="income"&&t.date.startsWith(`2026-${m}`)).reduce((s,t)=>s+t.amount,0));
  const mExp=months.map(m=>txns.filter(t=>t.type==="expense"&&t.date.startsWith(`2026-${m}`)).reduce((s,t)=>s+t.amount,0));
  const mProfit=months.map((_,i)=>mInc[i]-mExp[i]);
  const maxB=Math.max(...mInc,...mExp,1);

  const FC=["#6366f1","#f59e0b","#22c55e","#ec4899","#3b82f6","#7c3aed","#166534"];

  return <div>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
      <div><h1 style={{fontSize:18,fontWeight:900,color:T.text,margin:0}}>Executive Dashboard</h1><p style={{color:T.muted,margin:"1px 0 0",fontSize:10}}>Biznes boshqaruv paneli · {new Date().toLocaleDateString("uz-UZ")}</p></div>
    </div>

    {/* Executive KPI Row */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
      {[
        ["📥","Bu Oy Leadlar",thisMonthLeads,"yangi","#6366f1"],
        ["📞","Aloqa %",`${contactRate}%`,"kontakt qilingan","#f59e0b"],
        ["📄","Shartnoma %",`${contractRate}%`,"bitim yopilgan","#22c55e"],
        ["✈️","Jo'nab Ketdi",`${deployRate}%`,`${gone} ta`,T.green],
        perm.canFin?["💰","O'rt. daromad",fmtMs(avgRev),"har mijoz",T.yellow]:["⚠️","Muddati O'tgan",overdueTask,"vazifa",T.red],
      ].map(([icon,lb,val,sub,c])=>(
        <div key={lb} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 13px",borderTop:`3px solid ${c}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:600,flex:1}}>{lb}</span><span style={{fontSize:16}}>{icon}</span></div>
          <div style={{fontSize:20,fontWeight:900,color:T.text,lineHeight:1}}>{val}</div>
          <div style={{fontSize:9,color:T.muted,marginTop:2}}>{sub}</div>
        </div>
      ))}
    </div>
    {perm.canFin&&<div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
      {[
        ["💚","Jami Kirim",`+${fmtMs(totalInc)} so'm`,"barcha vaqt",T.green],
        ["🔴","Jami Chiqim",`-${fmtMs(totalExp)} so'm`,"barcha vaqt",T.red],
        ["⚖️","Balans",fmtMs(totalInc-totalExp),(totalInc-totalExp)>=0?"+":"-",totalInc-totalExp>=0?T.green:T.red],
        ["💰","Sof Foyda",`${fmtMs(sofF)} so'm`,"tugagan jarayonlar",T.yellow],
        ["📊","Jami Mijozlar",total,`${gone} muvaffaqiyatli`,T.accent],
      ].map(([icon,lb,val,sub,c])=>(
        <div key={lb} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 13px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:9,color:T.muted,fontWeight:600,textTransform:"uppercase"}}>{lb}</span><span>{icon}</span></div>
          <div style={{fontSize:16,fontWeight:900,color:c}}>{val}</div>
          <div style={{fontSize:9,color:T.muted}}>{sub}</div>
        </div>
      ))}
    </div>}

    {/* Alerts */}
    {(overdueTask>0||soonTask>0||lostLeads>50)&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {overdueTask>0&&<div style={{background:`${T.red}15`,border:`1px solid ${T.red}44`,borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:18}}>🔴</span><div><div style={{fontSize:11,fontWeight:700,color:T.red}}>Muddati o'tgan: {overdueTask} ta vazifa</div><div style={{fontSize:9,color:T.muted}}>Tezkor chora ko'ring</div></div>
      </div>}
      {soonTask>0&&<div style={{background:`${T.yellow}15`,border:`1px solid ${T.yellow}44`,borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:18}}>🟡</span><div><div style={{fontSize:11,fontWeight:700,color:T.yellow}}>Yaqinlashmoqda: {soonTask} ta</div><div style={{fontSize:9,color:T.muted}}>2 kun ichida muddat</div></div>
      </div>}
      {visaLeads>0&&<div style={{background:`${T.purple}15`,border:`1px solid ${T.purple}44`,borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:18}}>📋</span><div><div style={{fontSize:11,fontWeight:700,color:T.purple}}>Viza jarayonida: {visaLeads} ta</div><div style={{fontSize:9,color:T.muted}}>Elchixona / kutish</div></div>
      </div>}
      {contractLeads>5&&<div style={{background:`${T.green}15`,border:`1px solid ${T.green}44`,borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:18}}>🟢</span><div><div style={{fontSize:11,fontWeight:700,color:T.green}}>Shartnoma: {contractLeads} ta aktiv</div><div style={{fontSize:9,color:T.muted}}>To'lov kutilmoqda</div></div>
      </div>}
    </div>}

    {/* Main 3-col grid */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
      {/* Funnel with conversion */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <h3 style={{margin:0,fontSize:11,fontWeight:700,color:T.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>🔽 Funnel + Konversiya</h3>
        </div>
        {fData.map(({g,n},i)=>{
          const pct=total>0?((n/total)*100).toFixed(0):0;
          const prevN=i>0?fData[i-1].n:total;
          const stagePct=prevN>0?((n/prevN)*100).toFixed(0):0;
          return <div key={g} style={{marginBottom:7}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2,alignItems:"center"}}>
              <span style={{fontSize:10,color:T.sub}}>{g}</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:9,color:T.muted}}>{pct}% jami</span>
                {i>0&&<span style={{fontSize:8,background:`${FC[i]}22`,color:FC[i],borderRadius:3,padding:"0 4px",fontWeight:700}}>{stagePct}%</span>}
                <span style={{fontSize:10,fontWeight:700,color:T.text}}>{n}</span>
              </div>
            </div>
            <div style={{background:T.border,borderRadius:3,height:5}}><div style={{width:`${(n/total)*100}%`,background:FC[i],borderRadius:3,height:5,transition:"width 0.3s"}}/></div>
          </div>;
        })}
      </div>

      {/* Team performance */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
        <h3 style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:T.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>👔 Xodimlar Samaradorligi</h3>
        {teamStats.slice(0,5).map(({t,total:tot,gone:g,conv,kpi,inc})=>(
          <div key={t.id} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 0",borderBottom:`1px solid ${T.border}22`}}>
            <Av id={t.id} team={team} size={22}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</div>
              <div style={{display:"flex",gap:6,fontSize:8,color:T.muted,marginTop:1}}>
                <span>Lead:{tot}</span><span style={{color:T.green}}>✓{g}</span><span style={{color:T.accent}}>{conv}%</span><span style={{color:T.cyan}}>KPI:{kpi}</span>
              </div>
            </div>
            {perm.canFin&&<span style={{fontSize:9,fontWeight:700,color:T.green,flexShrink:0}}>{fmtMs(inc)}</span>}
          </div>
        ))}
        {teamStats.length===0&&<div style={{color:T.muted,fontSize:11,textAlign:"center",padding:16}}>Ma'lumot yo'q</div>}
      </div>

      {/* Country analytics */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
        <h3 style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:T.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>🌍 Mamlakat Tahlili</h3>
        {byCon.map(([c,d],i)=>{
          const maxC=Math.max(...byCon.map(([,x])=>x.count),1);
          return <div key={c} style={{marginBottom:7}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2,alignItems:"center"}}>
              <span style={{color:T.sub,fontSize:10,maxWidth:70,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c}</span>
              <div style={{display:"flex",gap:7,alignItems:"center"}}>
                {d.gone>0&&<span style={{fontSize:8,color:T.green,fontWeight:600}}>✓{d.gone}</span>}
                {perm.canFin&&d.revenue>0&&<span style={{fontSize:8,color:T.yellow,fontWeight:600}}>{fmtMs(d.revenue)}</span>}
                <span style={{fontSize:10,fontWeight:700,color:T.text}}>{d.count}</span>
              </div>
            </div>
            <div style={{background:T.border,borderRadius:3,height:4}}><div style={{width:`${(d.count/maxC)*100}%`,background:T.accent,borderRadius:3,height:4}}/></div>
          </div>;
        })}
      </div>
    </div>

    {/* Source analytics full table */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
        <h3 style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:T.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>📣 Manba Tahlili</h3>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
            <thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
              {["Manba","Leadlar","Shartnoma","Jo'nab","Daromad"].map(h=><th key={h} style={{padding:"4px 6px",textAlign:"left",fontSize:8,fontWeight:600,color:T.muted,textTransform:"uppercase"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {bySrc.map(([src,d])=>(
                <tr key={src} style={{borderBottom:`1px solid ${T.border}22`}}>
                  <td style={{padding:"5px 6px",color:T.text,fontWeight:600}}>{src}</td>
                  <td style={{padding:"5px 6px",color:T.text}}>{d.count}</td>
                  <td style={{padding:"5px 6px",color:T.green,fontWeight:600}}>{d.contracts}</td>
                  <td style={{padding:"5px 6px",color:T.accent,fontWeight:600}}>{d.gone}</td>
                  <td style={{padding:"5px 6px",color:T.yellow,fontWeight:600}}>{perm.canFin?fmtMs(d.revenue):"–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Finance chart */}
      {perm.canFin&&<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
        <h3 style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:T.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>📊 Oylik Moliya 2026</h3>
        <div style={{display:"flex",gap:8,alignItems:"flex-end",height:90,paddingBottom:18,position:"relative"}}>
          {months.map((m,i)=>(
            <div key={m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{width:"100%",display:"flex",gap:2,alignItems:"flex-end",height:72}}>
                <div style={{flex:1,background:`${T.green}88`,borderRadius:"2px 2px 0 0",height:`${(mInc[i]/maxB)*72}px`,minHeight:2,transition:"height 0.3s"}}/>
                <div style={{flex:1,background:`${T.red}88`,borderRadius:"2px 2px 0 0",height:`${(mExp[i]/maxB)*72}px`,minHeight:2}}/>
                <div style={{flex:1,background:`${T.yellow}88`,borderRadius:"2px 2px 0 0",height:`${Math.max(0,mProfit[i]/maxB)*72}px`,minHeight:2}}/>
              </div>
              <span style={{fontSize:8,color:T.muted,position:"absolute",bottom:2}}>{"JFMAM"[i]}</span>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          {[[T.green,"Kirim"],[T.red,"Chiqim"],[T.yellow,"Foyda"]].map(([c,l])=><div key={l} style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:T.muted}}><div style={{width:8,height:8,borderRadius:2,background:c}}/>{l}</div>)}
        </div>
      </div>}
    </div>

    {/* Time analytics + Due tasks */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
        <h3 style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:T.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>⏱️ Vaqt Tahlili</h3>
        {[
          ["Lead → Shartnoma","O'rtacha","~14 kun",T.accent],
          ["Shartnoma → Hujjatlar","O'rtacha","~21 kun",T.blue],
          ["Hujjatlar → Viza","O'rtacha","~30 kun",T.purple],
          ["Viza → Jo'nab","O'rtacha","~7 kun",T.green],
        ].map(([step,lb,val,c])=>(
          <div key={step} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${T.border}22`}}>
            <div><div style={{fontSize:10,fontWeight:600,color:T.text}}>{step}</div><div style={{fontSize:8,color:T.muted}}>{lb}</div></div>
            <span style={{fontSize:12,fontWeight:800,color:c}}>{val}</span>
          </div>
        ))}
        <div style={{marginTop:8,padding:"8px 10px",background:`${T.accent}12`,borderRadius:7,fontSize:9,color:T.muted}}>
          💡 Jami jarayon: <b style={{color:T.accent}}>~72 kun</b> lead → jo'nab
        </div>
      </div>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
        <h3 style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:T.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>⚠️ Muddati Yaqin</h3>
        {tasks.filter(t=>t.status!=="done"&&(isOD(t.due)||isSoon(t.due))).slice(0,5).map(t=>{const od=isOD(t.due);const lead=leads.find(l=>l.id===t.leadId);return(
          <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${T.border}22`}}>
            <div style={{display:"flex",gap:7,alignItems:"center"}}><Av id={t.assignee} team={team} size={20}/><div><div style={{fontSize:10,fontWeight:600,color:T.text}}>{t.title}</div>{lead&&<div style={{fontSize:8,color:T.accent}}>{lead.name}</div>}</div></div>
            <span style={{fontSize:9,color:od?T.red:T.yellow,fontWeight:700}}>{od?"⚠️ O'tdi":"⏰ "+fmtD(t.due)}</span>
          </div>
        );})}
        {tasks.filter(t=>t.status!=="done"&&(isOD(t.due)||isSoon(t.due))).length===0&&<div style={{color:T.muted,fontSize:11,textAlign:"center",padding:16}}>Muddati yaqin vazifa yo'q ✅</div>}
      </div>
    </div>
  </div>;
}


// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark,setDark]=useState(true); const [col,setCol]=useState(false);
  const [team,setTeam]=useState(INIT_TEAM); const [roles,setRoles]=useState(INIT_ROLES);
  const [user,setUser]=useState(null); const [page,setPage]=useState("pipeline");
  const [leads,setLeads]=useState(INIT_LEADS); const [tasks,setTasks]=useState(INIT_TASKS);
  const [txns,setTxns]=useState(INIT_TXN); const [config,setConfig]=useState(INIT_CFG);
  const [drawer,setDrawer]=useState(null);
  const [notifs,setNotifs]=useState([]);
  const [debts,setDebts]=useState([]);
  const [showNotif,setShowNotif]=useState(false);
  const T=mkT(dark);

  const addNotif=useCallback((msg,type="info")=>setNotifs(p=>[{id:uid(),msg,type,at:new Date().toISOString()},...p].slice(0,50)),[]);
  const saveLead=useCallback(f=>{
    const isNew=!leads.some(l=>l.id===f.id);
    setLeads(p=>p.some(l=>l.id===f.id)?p.map(l=>l.id===f.id?f:l):[...p,f]);
    if(isNew){addNotif(`🆕 Yangi lead qo'shildi: ${f.name}`);}
    else {
      const old=leads.find(l=>l.id===f.id);
      if(old&&old.status!==f.status)addNotif(`📌 ${f.name}: ${old.status} → ${f.status}`);
    }
    setDrawer(null);
  },[leads,addNotif]);
  const addTask=useCallback(t=>{setTasks(p=>[...p,t]);addNotif(`📋 Yangi vazifa: ${t.title}`);},[addNotif]);
  const openLead=l=>setDrawer(l||{id:`NO-${Math.floor(Math.random()*9000)+1000}`,name:"",phone:"",telegram:"",status:"Yangi",country:"",sector:"",position:"",ownerSales:null,ownerConsult:null,ownerDocs:null,source:"",gender:"",comment:"",q1:false,q2:false,q3:false,xba:false,kpiSales:false,kpiConsult:false,kpiDocs:false,q1R:null,q2R:null,q3R:null,xbaR:null,cv:{},history:[],sofFoyda:null,docs:{},createdAt:new Date().toISOString().slice(0,10)});

  const myNotif=user?tasks.filter(t=>t.assignee===user.id&&t.status!=="done"&&(isOD(t.due)||isSoon(t.due))).length:0;
  const newLeadNotifs=notifs.filter(n=>n.at>=(new Date(Date.now()-300000)).toISOString());
  const totalNotif=myNotif+newLeadNotifs.length;

  if(!user)return <Login onLogin={u=>{setUser(u);setPage("pipeline");}} team={team} roles={roles}/>;
  const perm=roles[user.role]||{};
  const PROPS={leads,tasks,team,user,open:openLead,config,roles};

  return <ThemeCtx.Provider value={T}>
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:T.text}}>
      <Sidebar user={user} pg={page} go={setPage} logout={()=>setUser(null)} notif={totalNotif} roles={roles} dark={dark} setDark={setDark} col={col} setCol={setCol}/>
      <div style={{flex:1,overflow:"auto",minWidth:0,display:"flex",flexDirection:"column"}}>
        {/* Topbar */}
        <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:"7px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:200,flexShrink:0}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <span style={{color:T.text,fontSize:12}}>Salom, <b>{user.name}</b></span>
            {perm.canFin&&(()=>{
              const tI=txns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
              const tE=txns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
              const sf=leads.filter(l=>DONE.includes(l.status)&&l.sofFoyda).reduce((s,l)=>s+(l.sofFoyda||0),0);
              return <div style={{display:"flex",gap:8,paddingLeft:10,borderLeft:`1px solid ${T.border}`,fontSize:10}}>
                {[["Kirim",`+${fmtMs(tI)}`,T.green],["Chiqim",`-${fmtMs(tE)}`,T.red],["Balans",fmtMs(tI-tE),(tI-tE)>=0?T.green:T.red],["Sof Foyda",fmtMs(sf),T.yellow]].map(([lb,val,c])=>(
                  <div key={lb}><span style={{color:T.muted}}>{lb}: </span><b style={{color:c}}>{val}</b></div>
                ))}
              </div>;
            })()}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{background:`${roles[user.role]?.color||T.accent}22`,color:roles[user.role]?.color||T.accent,fontSize:8,fontWeight:700,padding:"2px 7px",borderRadius:20,textTransform:"uppercase"}}>{roles[user.role]?.label}</span>
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowNotif(p=>!p)} style={{position:"relative",background:showNotif?`${T.accent}22`:T.card2,border:`1px solid ${showNotif?T.accent+"66":T.border}`,borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:showNotif?T.accent:T.muted}}>
                {I.bell}
                {totalNotif>0&&<span style={{position:"absolute",top:-3,right:-3,background:T.red,color:"#fff",borderRadius:10,fontSize:7,fontWeight:700,padding:"0 3px",minWidth:13,textAlign:"center"}}>{totalNotif}</span>}
              </button>
              {showNotif&&<div style={{position:"absolute",top:"110%",right:0,width:290,background:T.card,border:`1px solid ${T.border}`,borderRadius:11,boxShadow:T.shadow,zIndex:500,padding:12,maxHeight:380,overflowY:"auto"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                  <span style={{fontSize:12,fontWeight:700,color:T.text}}>🔔 Eslatmalar</span>
                  <button onClick={()=>setShowNotif(false)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted}}>{I.x}</button>
                </div>
                {newLeadNotifs.map(n=>(
                  <div key={n.id} style={{background:`${T.accent}15`,border:`1px solid ${T.accent}44`,borderRadius:6,padding:"7px 9px",marginBottom:5,borderLeft:`3px solid ${T.accent}`}}>
                    <div style={{fontSize:11,color:T.text}}>{n.msg}</div>
                    <div style={{fontSize:9,color:T.muted,marginTop:2}}>{fmtD(n.at)}</div>
                  </div>
                ))}
                {tasks.filter(t=>t.assignee===user.id&&t.status!=="done"&&(isOD(t.due)||isSoon(t.due))).map(t=>{const od=isOD(t.due);const lead=leads.find(l=>l.id===t.leadId);return(
                  <div key={t.id} onClick={()=>{setPage("tasks");setShowNotif(false);}} style={{background:od?`${T.red}15`:`${T.yellow}15`,border:`1px solid ${od?T.red:T.yellow}44`,borderRadius:6,padding:"7px 9px",marginBottom:5,cursor:"pointer",borderLeft:`3px solid ${od?T.red:T.yellow}`}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.text}}>{t.title}</div>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}><span style={{fontSize:9,color:od?T.red:T.yellow,fontWeight:700}}>{od?"⚠️ O'tdi":"⏰ "+fmtD(t.due)}</span>{lead&&<span style={{fontSize:9,color:T.accent}}>{lead.name}</span>}</div>
                  </div>
                );})}
                {totalNotif===0&&<div style={{color:T.muted,fontSize:11,textAlign:"center",padding:12}}>Eslatma yo'q ✅</div>}
              </div>}
            </div>
          </div>
        </div>
        <div style={{flex:1,padding:(page==="finance"||page==="docspipe")?0:"14px 18px",overflow:(page==="finance"||page==="docspipe")?"hidden":"auto"}}>
          {page==="dashboard"  && <Dashboard leads={leads} tasks={tasks} user={user} team={team} txns={txns} roles={roles}/>}
          {page==="pipeline"   && <Pipeline {...PROPS} tasks={tasks} addLead={()=>openLead(null)}/>}
          {page==="leads"      && <LeadsList {...PROPS} tasks={tasks} addLead={()=>openLead(null)} setLeads={setLeads}/>}
          {page==="tasks"      && <Tasks tasks={tasks} setTasks={setTasks} leads={leads} user={user} team={team} roles={roles}/>}
          {page==="finance"    && perm.canFin && <Finance leads={leads} setLeads={setLeads} team={team} user={user} txns={txns} setTxns={setTxns} config={config} addNotif={addNotif}/>}
          {page==="salary"     && perm.canFin && <SalaryPage team={team} setTeam={setTeam} txns={txns} setTxns={setTxns} user={user}/>}
          {page==="empreport"  && <EmpReport leads={leads} tasks={tasks} team={team} user={user}/>}
          {page==="docspipe"  && <DocsPipeline leads={leads} tasks={tasks} team={team} user={user} open={openLead} config={config} roles={roles} setLeads={setLeads}/>}
          {page==="debts"     && perm.canFin && <DebtsPage debts={debts} setDebts={setDebts} team={team} user={user} config={config}/>}
          {page==="visa"       && <Visa user={user} roles={roles}/>}
          {page==="team"       && <TeamPage user={user} team={team} setTeam={setTeam} roles={roles}/>}
          {page==="settings"   && <Settings user={user} config={config} setConfig={setConfig} roles={roles} setRoles={setRoles}/>}
        </div>
      </div>
      {drawer&&<Drawer lead={drawer} user={user} team={team} leads={leads} tasks={tasks} onSave={saveLead} onClose={()=>setDrawer(null)} onAddTask={addTask} config={config} roles={roles} addNotif={addNotif}/>}
    </div>
  </ThemeCtx.Provider>;
}// ─── LEADS LIST (Image-style full table) ─────────────────────────────────────
