// ─── EXPORT TRANSLATIONS ─────────────────────────────────────────────────────
// The candidate export is often sent outside the company — to employers in
// Bulgaria, Poland or Montenegro — so both the HEADERS and the VALUES need
// translating. Pipeline stages and document steps are stored as Uzbek keys, so
// they are looked up here rather than being translated at the point of use.

const EXPORT_LANGS = [
  { key: "uz", label: "O'zbekcha" },
  { key: "ru", label: "Русский" },
  { key: "en", label: "English" },
];

// Column headers.
const COL_I18N = {
  name:      { uz: "Ism",             ru: "Имя",                en: "Name" },
  phone:     { uz: "Telefon",         ru: "Телефон",            en: "Phone" },
  status:    { uz: "Holat",           ru: "Статус",             en: "Status" },
  vacancy:   { uz: "Vakansiya",       ru: "Вакансия",           en: "Vacancy" },
  country:   { uz: "Davlat",          ru: "Страна",             en: "Country" },
  position:  { uz: "Lavozim",         ru: "Должность",          en: "Position" },
  sector:    { uz: "Soha",            ru: "Сфера",              en: "Sector" },
  gender:    { uz: "Jinsi",           ru: "Пол",                en: "Gender" },
  source:    { uz: "Manba",           ru: "Источник",           en: "Source" },
  addedBy:   { uz: "Biriktirgan",     ru: "Добавил",            en: "Added by" },
  appliedAt: { uz: "Qo'shilgan sana", ru: "Дата добавления",    en: "Date added" },
  leadId:    { uz: "Mijoz ID",        ru: "ID клиента",         en: "Client ID" },
  note:      { uz: "Izoh",            ru: "Примечание",         en: "Note" },
  income:    { uz: "Kirim",           ru: "Доход",              en: "Income" },
  expense:   { uz: "Chiqim",          ru: "Расход",             en: "Expense" },
  balance:   { uz: "Balans",          ru: "Баланс",             en: "Balance" },
  _date:     { uz: "sana",            ru: "дата",               en: "date" },
};

// Document tracks and their steps.
const TRACK_I18N = {
  shartnoma:      { uz: "Ish shartnomasi", ru: "Трудовой договор",   en: "Work contract" },
  diplom:         { uz: "Diplom",          ru: "Диплом",             en: "Diploma" },
  prava:          { uz: "Prava",           ru: "Водительские права", en: "Driving licence" },
  sudlanmaganlik: { uz: "Sudlanmaganlik",  ru: "Справка о несудимости", en: "Police clearance" },
  zagran:         { uz: "Zagran",          ru: "Загранпаспорт",      en: "Passport" },
};

const STEP_I18N = {
  keldi:          { uz: "Keldi",                        ru: "Пришёл",                  en: "Received" },
  imzolandi:      { uz: "Imzolandi",                    ru: "Подписан",                en: "Signed" },
  skaner:         { uz: "Skaner tashlandi",             ru: "Скан отправлен",          en: "Scan uploaded" },
  qabul:          { uz: "Qabul qilindi",                ru: "Принят",                  en: "Received" },
  apostilga:      { uz: "Tarjima/apostilga topshirildi",ru: "Сдан на перевод/апостиль",en: "Sent for translation/apostille" },
  apostil_tayyor: { uz: "Apostil tayyor",               ru: "Апостиль готов",          en: "Apostille ready" },
  olindi:         { uz: "Olindi",                       ru: "Получен",                 en: "Obtained" },
  jonatildi:      { uz: "Jo'natildi",                   ru: "Отправлен",               en: "Sent" },
  yetib_bordi:    { uz: "Yetib bordi",                  ru: "Доставлен",               en: "Delivered" },
};

// Pipeline stages, used for the Status column's VALUE.
const STAGE_I18N = {
  "Yangi":                         { ru: "Новый",                        en: "New" },
  "Qilindi":                       { ru: "Обработан",                    en: "Processed" },
  "Boglanildi":                    { ru: "Связались",                    en: "Contacted" },
  "Onlayn Suhbat Uchun":           { ru: "На онлайн-собеседование",      en: "For online interview" },
  "Onlayn Suhbat":                 { ru: "Онлайн-собеседование",         en: "Online interview" },
  "Suhbat":                        { ru: "Собеседование",                en: "Interview" },
  "Shartnoma qildi":               { ru: "Заключил договор",             en: "Contract signed" },
  "Hujjat":                        { ru: "Документы",                    en: "Documents" },
  "XBA To'lov qildi":              { ru: "Оплатил XBA",                  en: "XBA paid" },
  "CV Topshirildi":                { ru: "CV подано",                    en: "CV submitted" },
  "Interview ga qo'yildi":         { ru: "Назначено интервью",           en: "Interview scheduled" },
  "Ishga qabul qilindi":           { ru: "Принят на работу",             en: "Hired" },
  "1 - Qism To'landi":             { ru: "Оплачена 1-я часть",           en: "1st instalment paid" },
  "Hujjatlar Tayyorlanmoqda":      { ru: "Документы готовятся",          en: "Documents in preparation" },
  "Hujjatlar Jonatilishga Tayyor": { ru: "Документы готовы к отправке",  en: "Documents ready to send" },
  "Hujjatlar Jonatildi":           { ru: "Документы отправлены",         en: "Documents sent" },
  "Ish shartnomasi keldi":         { ru: "Трудовой договор пришёл",      en: "Work contract received" },
  "Ish shartnomasi imzolandi":     { ru: "Трудовой договор подписан",    en: "Work contract signed" },
  "Taklifnoma keldi":              { ru: "Приглашение получено",         en: "Invitation received" },
  "Elchixonaga Hujjatlar Tayyor":  { ru: "Документы для посольства готовы", en: "Embassy documents ready" },
  "Vizaga Topshirildi":            { ru: "Подано на визу",               en: "Visa submitted" },
  "Viza Oldi":                     { ru: "Виза получена",                en: "Visa granted" },
  "Jo'nab ketdi":                  { ru: "Выехал",                       en: "Departed" },
  "Viza Rad Etildi":               { ru: "Виза отклонена",               en: "Visa refused" },
  "Rad etildi":                    { ru: "Отказано",                     en: "Rejected" },
  "Bekor qildi":                   { ru: "Отменил",                      en: "Cancelled" },
  "Keyinchalik":                   { ru: "Позже",                        en: "Later" },
  "Anchagacha ko'tarmadi":         { ru: "Долго не отвечал",             en: "Long unreachable" },
};

// Fall back to the Uzbek original rather than showing a blank or a raw key:
// an untranslated value is still useful, an empty cell is not.
const trCol = (key, lang) => (COL_I18N[key] || {})[lang] || (COL_I18N[key] || {}).uz || key;
const trTrack = (key, lang, fallback) => (TRACK_I18N[key] || {})[lang] || fallback || key;
const trStep = (key, lang, fallback) => (STEP_I18N[key] || {})[lang] || fallback || key;
const trStage = (stage, lang) => {
  if (!stage) return "";
  if (lang === "uz") return stage;
  return (STAGE_I18N[stage] || {})[lang] || stage;
};

export { EXPORT_LANGS, trCol, trTrack, trStep, trStage };
