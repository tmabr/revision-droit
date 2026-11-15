/* Révisions — Droit L3
   App monopage sans dépendance (hors client Supabase optionnel).
   Données : un seul document JSON par utilisatrice, stocké localement + synchronisé sur Supabase si configuré. */
(() => {
'use strict';

/* ============================== Utilitaires ============================== */
const CFG = window.APP_CONFIG || {};
const LS_KEY = 'revisions-state-v1';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const pad = n => String(n).padStart(2, '0');
const dstr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dstr();
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); };
const diffDays = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
const fmtDate = s => s ? parseD(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
const fmtDateY = s => s ? parseD(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const fmtMin = m => { m = Math.round(m); return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)}` : `${m} min`; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Copié dans le presse-papiers'); }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('Copié'); }
}

/* ============================== Données de départ ============================== */
const LEVELS = ['Non vu', 'Lu', 'Fiché', 'Appris', 'Maîtrisé'];
const PALETTE = ['#C8643B', '#3F6FA3', '#5E8C61', '#8A4F7D', '#D49A2A', '#2F8C8C', '#D0677A', '#4B4F9C'];
const LEVEL_COLORS = ['#B9AE9E', '#3F6FA3', '#D49A2A', '#2F8C8C', '#5E8C61'];
const MOMENT_COLORS = { matin: '#D49A2A', journee: '#2F8C8C', soir: '#4B4F9C' };
const INTERVALS = [0, 1, 3, 7, 14, 30, 60]; // jours par boîte (répétition espacée)
const MOMENTS = [['matin', 'Matin'], ['journee', 'Journée'], ['soir', 'Soir']];

function seed() {
  const t = today();
  const mkSubj = (name, examIn, parts) => ({ id: uid(), demo: true, name, exam: addDays(t, examIn), parts: parts.map(p => ({ id: uid(), title: p, level: 0 })), fiches: [] });
  const adm = mkSubj('Droit administratif', 58, ['Introduction — Le service public', 'Partie 1 — Les actes administratifs', 'Partie 2 — Les contrats administratifs', 'Partie 3 — La responsabilité administrative']);
  const soc = mkSubj('Droit des sociétés', 60, ['Le contrat de société', 'La personnalité morale', 'La SARL', 'La SA et la SAS']);
  const pen = mkSubj('Droit pénal spécial', 63, ['Atteintes aux personnes', 'Atteintes aux biens', "Atteintes à la Nation et à l'État"]);
  const dip = mkSubj('Droit international public', 65, ['Les sources du droit international', 'Les sujets du droit international', 'La responsabilité internationale']);
  adm.parts[0].level = 2; adm.parts[1].level = 1; soc.parts[0].level = 3;
  const card = (s, partIdx, q, a) => ({ id: uid(), demo: true, subjectId: s.id, partId: s.parts[partIdx]?.id || '', q, a, box: 0, due: t, reviews: 0, lapses: 0, created: t });
  return {
    version: 1,
    settings: { name: 'Gwendo', focusGoal: 240, weekGoal: 1200 },
    subjects: [adm, soc, pen, dip],
    tasks: [
      { id: uid(), demo: true, title: 'Ficher la Partie 1 de droit administratif', subjectId: adm.id, due: addDays(t, 1), priority: 'haute', done: false },
      { id: uid(), demo: true, title: 'Relire le TD 4 de droit des sociétés', subjectId: soc.id, due: addDays(t, -1), priority: 'moyenne', done: false },
      { id: uid(), demo: true, title: 'Rendre la dissertation de DIP', subjectId: dip.id, due: addDays(t, 6), priority: 'haute', done: false },
    ],
    cards: [
      card(adm, 3, 'Arrêt Blanco (TC, 8 février 1873) : apport ?', "Consacre une responsabilité de l'État du fait des services publics, soumise à des règles spéciales distinctes du Code civil et relevant de la compétence du juge administratif."),
      card(adm, 1, 'Arrêt Nicolo (CE, Ass., 20 octobre 1989) : apport ?', "Le Conseil d'État accepte de contrôler la compatibilité d'une loi, même postérieure, avec un traité international (art. 55 de la Constitution)."),
      card(soc, 0, "Quel article définit le contrat de société ?", "Article 1832 du Code civil."),
      card(pen, 0, 'Élément moral du meurtre ?', "L'intention de donner la mort (animus necandi) — art. 221-1 C. pén."),
    ],
    qcm: [
      { id: uid(), demo: true, subjectId: adm.id, q: "Quel arrêt fonde l'autonomie de la responsabilité administrative ?", options: ['Arrêt Blanco (1873)', 'Arrêt Nicolo (1989)', 'Arrêt Cadot (1889)', 'Arrêt Benjamin (1933)'], answer: 0, explanation: "L'arrêt Blanco du Tribunal des conflits écarte l'application du Code civil à la responsabilité des services publics.", seen: 0, correct: 0 },
      { id: uid(), demo: true, subjectId: soc.id, q: "Combien d'associés au minimum pour constituer une SAS ?", options: ['1', '2', '7', 'Aucun minimum'], answer: 0, explanation: 'Une SAS peut être constituée par une seule personne (SASU).', seen: 0, correct: 0 },
      { id: uid(), demo: true, subjectId: pen.id, q: 'Quel article du Code pénal définit le vol ?', options: ['Art. 311-1', 'Art. 221-1', 'Art. 313-1', 'Art. 222-7'], answer: 0, explanation: "311-1 : vol ; 221-1 : meurtre ; 313-1 : escroquerie ; 222-7 : violences ayant entraîné la mort sans intention de la donner.", seen: 0, correct: 0 },
    ],
    exercises: [
      { id: uid(), demo: true, type: 'annale', subjectId: adm.id, title: 'Examen janvier — Dissertation', year: '2025', location: 'Dossier Annales › Droit administratif', enonce: '', status: 'todo', score: null, notes: '', draft: '' },
      { id: uid(), demo: true, type: 'cas', subjectId: pen.id, title: 'Cas pratique — Vol et escroquerie', year: '', location: '', enonce: "Paul subtilise le portefeuille de Jeanne dans le métro, puis utilise sa carte bancaire en se faisant passer pour elle auprès d'un commerçant. Qualifiez les faits.", status: 'todo', score: null, notes: '', draft: '' },
    ],
    sessions: [],
    habits: [
      ['Verre d\'eau au réveil', 'matin'], ['Pas d\'écran les 30 premières minutes', 'matin'], ['Planifier la journée', 'matin'],
      ['Boire 1,5 L d\'eau', 'journee'], ['Pause marche / air frais', 'journee'],
      ['Lecture 20 min', 'soir'], ['Préparer le lendemain', 'soir'], ['Coucher avant 23h30', 'soir'],
    ].map(([name, moment]) => ({ id: uid(), name, moment })),
    habitLog: {},
    resources: [
      { id: uid(), demo: true, title: 'Dossier principal des cours', subjectId: '', kind: 'dossier', target: 'Documents › Droit L3 (à adapter)', note: '' },
    ],
  };
}

function normalize(s) {
  const d = seed();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.settings = { ...d.settings, ...s.settings };
  s.subjects.forEach((x, i) => { if (!x.color) x.color = PALETTE[i % PALETTE.length]; });
  return s;
}

/* ============================== État & synchronisation ============================== */
let S = null;            // état courant
let sb = null;           // client Supabase
let user = null;
let sync = 'local';      // local | ok | pending | error
let lastRemote = null;   // updated_at de la dernière version connue côté serveur
let saveTimer = null;

function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch {} }
function loadLocal() { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; } }

function commit(opts = {}) {
  saveLocal();
  if (sb && user) {
    sync = 'pending'; paintSync();
    clearTimeout(saveTimer); saveTimer = setTimeout(pushRemote, 700);
  }
  if (opts.render !== false) render();
}

async function pushRemote() {
  const now = new Date().toISOString();
  const { error } = await sb.from('app_state').upsert({ user_id: user.id, data: S, updated_at: now });
  if (error) { sync = 'error'; console.error(error); toast('Erreur de synchronisation — les données restent sur ce PC'); }
  else { sync = 'ok'; lastRemote = now; }
  paintSync();
}

async function pullRemote(force) {
  if (!sb || !user || sync === 'pending') return;
  const { data, error } = await sb.from('app_state').select('data,updated_at').eq('user_id', user.id).maybeSingle();
  if (error) { sync = 'error'; paintSync(); return; }
  if (!data) { await pushRemote(); return; }
  if (force || !lastRemote || data.updated_at > lastRemote) {
    S = normalize(data.data); lastRemote = data.updated_at; saveLocal(); sync = 'ok'; render();
  }
}

function paintSync() {
  const el = $('#sync'); if (!el) return;
  const map = { local: ['local', 'Mode local'], ok: ['ok', 'Synchronisé'], pending: ['pending', 'Enregistrement…'], error: ['error', 'Erreur de synchro'] };
  const [c, l] = map[sync];
  el.innerHTML = `<i class="dot ${c}"></i>${l}`;
}

/* ============================== Démarrage & connexion ============================== */
async function boot() {
  if (CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return showLogin();
    user = session.user;
    await loadRemote();
  } else {
    S = normalize(loadLocal() || seed());
    sync = 'local';
    saveLocal();
  }
  startApp();
}

async function loadRemote() {
  const { data, error } = await sb.from('app_state').select('data,updated_at').eq('user_id', user.id).maybeSingle();
  if (error) { console.error(error); S = normalize(loadLocal() || seed()); sync = 'error'; return; }
  if (data) { S = normalize(data.data); lastRemote = data.updated_at; sync = 'ok'; saveLocal(); }
  else { S = normalize(loadLocal() || seed()); saveLocal(); await pushRemote(); }
}

function showLogin() {
  $('#app').innerHTML = `
  <div class="login">
    <div class="login-l">
      <div class="label">Licence 3 · Droit</div>
      <div class="word">Révisions</div>
      <p class="muted" style="max-width:420px;font-size:15px">Tes matières, tes fiches, tes révisions et ton rythme de travail, au même endroit, sur tous tes PC.</p>
    </div>
    <div class="login-r">
      <form class="login-box" id="login-form">
        <h2 style="margin-bottom:22px">Connexion</h2>
        <label class="field"><span>Email</span><input type="email" name="email" required autocomplete="username"></label>
        <label class="field"><span>Mot de passe</span><input type="password" name="password" required autocomplete="current-password"></label>
        <div class="err" id="login-err"></div>
        <button class="btn lg" style="width:100%;margin-top:10px">Se connecter</button>
      </form>
    </div>
  </div>`;
  $('#login-form').onsubmit = async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    $('#login-err').textContent = '';
    const { data, error } = await sb.auth.signInWithPassword({ email: fd.email.trim(), password: fd.password });
    if (error) { $('#login-err').textContent = 'Email ou mot de passe incorrect.'; return; }
    user = data.user; await loadRemote(); startApp();
  };
}

function startApp() {
  shell();
  if (!location.hash) location.hash = '#/accueil';
  render();
  window.onhashchange = () => { render(); window.scrollTo(0, 0); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pullRemote(); });
  setInterval(tickExClock, 500);
  if (sb && user) setInterval(() => pullRemote(), 60000);
}

const NAV = [['accueil', 'Tableau de bord'], ['matieres', 'Matières'], ['revisions', 'Révisions'], ['entrainement', 'Entraînement'], ['concentration', 'Concentration'], ['habitudes', 'Habitudes'], ['ressources', 'Ressources']];
const ICON_SETTINGS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

function shell() {
  $('#app').innerHTML = `
    <div class="topstrip">
      <span>Licence 3 · Droit</span>
      <span id="strip-mid">${esc(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</span>
      <span class="pill" id="sync"></span>
    </div>
    <header class="hdr">
      <a class="logo" href="#/accueil" id="logo"></a>
      <nav class="nav" id="nav">${NAV.map(([k, l]) => `<a href="#/${k}" data-nav="${k}">${l}</a>`).join('')}</nav>
      <div class="tools"><a class="iconbtn" href="#/reglages" title="Réglages">${ICON_SETTINGS}</a></div>
    </header>
    <main id="view"></main>`;
  paintSync();
}

/* ============================== Calculs ============================== */
const subj = id => S.subjects.find(s => s.id === id);
const subjName = id => subj(id)?.name || '—';
const planPct = s => s.parts.length ? Math.round(s.parts.reduce((a, p) => a + p.level, 0) / (s.parts.length * 4) * 100) : 0;
const cardsOf = (sid, pid) => S.cards.filter(c => c.subjectId === sid && (!pid || c.partId === pid));
const memOf = cs => cs.length ? Math.round(cs.reduce((a, c) => a + Math.min(c.box, 5), 0) / (cs.length * 5) * 100) : null;
const memPct = sid => memOf(cardsOf(sid));
const isDue = c => c.due <= today();
const dueCards = sid => S.cards.filter(c => (!sid || c.subjectId === sid) && isDue(c));
function subjPct(s) { const m = memPct(s.id); return m === null ? planPct(s) : Math.round(planPct(s) * 0.5 + m * 0.5); }
const minutesOn = (date, sid) => S.sessions.filter(x => x.date === date && (!sid || x.subjectId === sid)).reduce((a, x) => a + x.minutes, 0);
const PRIO_RANK = { haute: 0, moyenne: 1, basse: 2 };

function dueTag(due, done) {
  if (!due) return '';
  if (done) return `<span class="tag">${fmtDate(due)}</span>`;
  const d = diffDays(today(), due);
  if (d < 0) return `<span class="tag late">En retard · ${-d} j</span>`;
  if (d === 0) return `<span class="tag urgent">Aujourd'hui</span>`;
  if (d === 1) return `<span class="tag soon">Demain</span>`;
  if (d <= 7) return `<span class="tag soon">${fmtDate(due)}</span>`;
  return `<span class="tag">${fmtDate(due)}</span>`;
}
const bar = (pct, cls = '', color = '') => `<div class="bar ${cls}"><i style="width:${clamp(pct ?? 0, 0, 100)}%;${color ? `background:${color}` : ''}"></i></div>`;
const colorOf = id => subj(id)?.color || '#8B7B69';
const dotOf = id => id ? `<i class="sdot" style="background:${colorOf(id)}"></i>` : '';
const subjOptions = (val, none = 'Aucune / générale') => `${none !== null ? `<option value="">${none}</option>` : ''}${S.subjects.map(s => `<option value="${s.id}" ${s.id === val ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}`;
const partOptions = (sid, val) => `<option value="">Toute la matière</option>${(subj(sid)?.parts || []).map(p => `<option value="${p.id}" ${p.id === val ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}`;

/* ============================== Modale générique ============================== */
function modal(title, body, onSubmit, submitLabel = 'Enregistrer') {
  const dlg = $('#modal');
  dlg.innerHTML = `<form class="modal-form" novalidate>
    <div class="modal-head"><h3>${esc(title)}</h3><button type="button" class="x" data-close>×</button></div>
    <div class="modal-body">${body}</div>
    <div class="modal-foot">${onSubmit ? `<button type="button" class="btn ghost" data-close>Annuler</button><button class="btn" type="submit">${submitLabel}</button>` : `<button type="button" class="btn" data-close>Fermer</button>`}</div>
  </form>`;
  const f = dlg.querySelector('form');
  f.onsubmit = e => {
    e.preventDefault();
    if (!f.checkValidity()) { f.reportValidity(); return; }
    const fd = Object.fromEntries(new FormData(f));
    if (onSubmit && onSubmit(fd, f) !== false) dlg.close();
  };
  dlg.querySelectorAll('[data-close]').forEach(b => b.onclick = () => dlg.close());
  dlg.showModal();
  const first = f.querySelector('input:not([type=hidden]):not([type=radio]),textarea,select');
  if (first) first.focus();
  return f;
}
const fText = (name, label, val = '', attrs = '') => `<label class="field"><span>${label}</span><input name="${name}" value="${esc(val)}" ${attrs}></label>`;
const fArea = (name, label, val = '', attrs = '') => `<label class="field"><span>${label}</span><textarea name="${name}" ${attrs}>${esc(val)}</textarea></label>`;
const fSel = (name, label, opts, attrs = '') => `<label class="field"><span>${label}</span><select name="${name}" ${attrs}>${opts}</select></label>`;
const confirmModal = (title, text, fn, label = 'Supprimer') => modal(title, `<p>${text}</p>`, () => { fn(); }, label);

/* ============================== Routeur ============================== */
function route() { return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean); }

function render() {
  if (!S || !$('#view')) return;
  const r = route(); const page = r[0] || 'accueil';
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === page));
  $('#logo').textContent = (S.settings.name || 'Révisions').toUpperCase();
  const views = { accueil: vDashboard, matieres: vMatieres, revisions: vRevisions, entrainement: vEntrainement, concentration: vConcentration, habitudes: vHabitudes, ressources: vRessources, reglages: vReglages };
  const v = views[page] || vDashboard;
  $('#view').innerHTML = v(r);
}

/* ============================== Tableau de bord ============================== */
function vDashboard() {
  const t = today(); const h = new Date().getHours();
  const hello = h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour';
  const exams = S.subjects.filter(s => s.exam && s.exam >= t).sort((a, b) => a.exam.localeCompare(b.exam));
  const next = exams[0];
  const due = dueCards().length;
  const minToday = minutesOn(t);
  const open = S.tasks.filter(x => !x.done);
  const late = open.filter(x => x.due && x.due < t);
  const global = S.subjects.length ? Math.round(avg(S.subjects.map(subjPct))) : 0;
  const prios = [...open].sort((a, b) => {
    const la = a.due && a.due < t ? 0 : 1, lb = b.due && b.due < t ? 0 : 1;
    if (la !== lb) return la - lb;
    if ((a.due || '9') !== (b.due || '9')) return (a.due || '9999').localeCompare(b.due || '9999');
    return PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
  }).slice(0, 8);

  const horizon = addDays(t, 30);
  const deadlines = [
    ...S.subjects.filter(s => s.exam && s.exam >= t && s.exam <= horizon).map(s => ({ title: `Examen — ${s.name}`, date: s.exam, exam: true })),
    ...open.filter(x => x.due && x.due >= t && x.due <= horizon).map(x => ({ title: x.title, date: x.due, sid: x.subjectId })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7);

  // Révisions ciblées : parties les moins avancées des matières aux examens les plus proches
  const targets = [];
  [...S.subjects].sort((a, b) => (a.exam || '9999').localeCompare(b.exam || '9999')).forEach(s => {
    s.parts.forEach(p => { if (p.level <= 2) targets.push({ s, p }); });
  });
  targets.sort((a, b) => a.p.level - b.p.level || (a.s.exam || '9999').localeCompare(b.s.exam || '9999'));
  const weakCards = S.subjects.map(s => ({ s, n: dueCards(s.id).length })).filter(x => x.n).sort((a, b) => b.n - a.n);

  const habitsDone = (S.habitLog[t] || []).length;

  return `
  <section class="hero">
    <div class="hero-l">
      <div>
        <div class="label">${esc(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
        <h1 style="margin-top:14px">${hello},<br>${esc(S.settings.name)}.</h1>
        <p>${due ? `${due} carte${due > 1 ? 's' : ''} à réviser aujourd'hui` : 'Aucune carte à réviser aujourd\'hui'}${late.length ? ` · ${late.length} tâche${late.length > 1 ? 's' : ''} en retard` : ''}${minToday ? ` · ${fmtMin(minToday)} de travail aujourd'hui` : ''}.</p>
      </div>
      <div class="row wrap">
        <a class="btn lg accent" href="#/revisions/session">${due ? `Réviser maintenant (${due})` : 'Réviser'}</a>
        <a class="btn ghost lg" href="#/concentration">Saisir mon temps</a>
      </div>
    </div>
    <div class="hero-r" style="--c:${next ? next.color : '#C8643B'}">
      ${next ? `
        <div class="label">Prochain examen</div>
        <div><div class="big">J-${diffDays(t, next.exam)}</div>
        <div class="serif" style="font-size:24px;margin-top:14px">${esc(next.name)}</div>
        <div class="small" style="color:#A99D8C;margin-top:4px">${fmtDateY(next.exam)}</div></div>`
      : `<div class="label">Prochain examen</div><div class="serif" style="font-size:24px">Aucune date d'examen.<br><a href="#/matieres" class="link" style="color:#E9E1D5">Ajouter les dates</a></div>`}
    </div>
  </section>
  <section class="kpis">
    <div class="kpi" style="--c:#3F6FA3"><div class="label">À réviser</div><div class="v">${due}</div><div class="s">cartes dues aujourd'hui</div></div>
    <div class="kpi" style="--c:#D49A2A"><div class="label">Travail du jour</div><div class="v">${fmtMin(minToday)}</div><div class="s">objectif ${fmtMin(S.settings.focusGoal)}</div>${bar(minToday / S.settings.focusGoal * 100, '', '#D49A2A')}</div>
    <div class="kpi ${late.length ? 'alert' : ''}" style="--c:#C8643B"><div class="label">En retard</div><div class="v">${late.length}</div><div class="s">tâche${late.length > 1 ? 's' : ''} dépassée${late.length > 1 ? 's' : ''}</div></div>
    <div class="kpi" style="--c:#5E8C61"><div class="label">Progression globale</div><div class="v">${global}<small> %</small></div><div class="s">plan + mémorisation</div>${bar(global, '', '#5E8C61')}</div>
  </section>

  <section class="grid g-main section">
    <div class="card">
      <div class="card-head"><h3>Priorités</h3><button class="link" data-act="task-add">+ Ajouter</button></div>
      ${prios.length ? `<ul class="list">${prios.map(taskRow).join('')}</ul>` : '<div class="empty">Rien en attente. Ajoute tes prochaines tâches.</div>'}
      ${open.length > prios.length ? `<div style="margin-top:12px"><button class="link" data-act="tasks-all">Voir les ${open.length} tâches</button></div>` : ''}
    </div>
    <div class="card">
      <div class="card-head"><h3>Échéances</h3><span class="label">30 prochains jours</span></div>
      ${deadlines.length ? `<ul class="list">${deadlines.map(d => {
        const n = diffDays(t, d.date);
        return `<li><div class="grow"><div class="title">${d.exam ? `<strong>${esc(d.title)}</strong>` : esc(d.title)}</div>${d.sid ? `<div class="small muted">${esc(subjName(d.sid))}</div>` : ''}</div>
          <span class="tag ${n <= 3 ? 'urgent' : n <= 7 ? 'soon' : d.exam ? 'dark' : ''}">${n === 0 ? "Aujourd'hui" : `J-${n}`}</span></li>`;
      }).join('')}</ul>` : '<div class="empty">Aucune échéance dans les 30 jours.</div>'}
    </div>
  </section>

  <section class="band">
    ${S.subjects.map(s => `<a class="band-item" href="#/matieres/${s.id}" style="--c:${s.color}">
      <div class="meta">${s.exam ? `Examen ${fmtDate(s.exam)}` : 'Pas de date'}</div>
      <div class="t">${esc(s.name)}</div>
      <div><div class="row between small" style="margin-bottom:6px;opacity:.85"><span>Progression</span><span>${subjPct(s)} %</span></div>${bar(subjPct(s))}</div>
      <div class="go">Ouvrir →</div></a>`).join('') || '<div class="band-item"><div class="t">Aucune matière</div><a class="go" href="#/matieres">Créer →</a></div>'}
  </section>

  <section class="grid g2 section">
    <div class="card">
      <div class="card-head"><h3>Révisions ciblées</h3><a class="link" href="#/revisions">Tout voir</a></div>
      ${weakCards.length ? `<div class="label" style="margin-bottom:6px">Cartes en attente</div><ul class="list">${weakCards.slice(0, 3).map(x => `<li>${dotOf(x.s.id)}<div class="grow title">${esc(x.s.name)}</div><span class="tag">${x.n} carte${x.n > 1 ? 's' : ''}</span><a class="btn sm" href="#/revisions/session/${x.s.id}">Réviser</a></li>`).join('')}</ul>` : ''}
      <div class="label" style="margin:${weakCards.length ? '18px' : '0'} 0 6px">Parties les moins avancées</div>
      ${targets.length ? `<ul class="list">${targets.slice(0, 4).map(({ s, p }) => `<li><div class="grow"><div class="title">${esc(p.title)}</div><div class="small muted">${dotOf(s.id)}${esc(s.name)}</div></div><span class="tag lv" style="--c:${LEVEL_COLORS[p.level]}">${LEVELS[p.level]}</span><a class="link" href="#/matieres/${s.id}">Plan</a></li>`).join('')}</ul>` : '<div class="empty">Tout est au moins fiché. Bravo.</div>'}
    </div>
    <div class="card">
      <div class="card-head"><h3>Habitudes du jour</h3><span class="label">${habitsDone} / ${S.habits.length}</span></div>
      ${S.habits.length ? `<ul class="list">${S.habits.map(hb => { const on = (S.habitLog[t] || []).includes(hb.id); return `<li class="${on ? 'done' : ''}"><input type="checkbox" class="chk" ${on ? 'checked' : ''} data-act="habit-toggle" data-id="${hb.id}" data-date="${t}"><span class="grow title">${esc(hb.name)}</span><span class="tag lv" style="--c:${MOMENT_COLORS[hb.moment]}">${MOMENTS.find(m => m[0] === hb.moment)?.[1] || ''}</span></li>`; }).join('')}</ul>` : '<div class="empty">Aucune habitude.</div>'}
    </div>
  </section>`;
}

function taskRow(x) {
  return `<li class="${x.done ? 'done' : ''}">
    <input type="checkbox" class="chk" ${x.done ? 'checked' : ''} data-act="task-toggle" data-id="${x.id}">
    <i class="prio ${x.priority}" title="Priorité ${x.priority}"></i>
    <div class="grow"><div class="title">${esc(x.title)}</div>${x.subjectId ? `<div class="small muted">${dotOf(x.subjectId)}${esc(subjName(x.subjectId))}</div>` : ''}</div>
    ${dueTag(x.due, x.done)}
    <button class="x" data-act="task-edit" data-id="${x.id}" title="Modifier" style="font-size:13px">✎</button>
  </li>`;
}

function taskForm(x = {}) {
  return `${fText('title', 'Tâche', x.title, 'required placeholder="Ex. Ficher le chapitre 3"')}
  <div class="fields2">${fSel('subjectId', 'Matière', subjOptions(x.subjectId))}${fText('due', 'Échéance', x.due || '', 'type="date"')}</div>
  ${fSel('priority', 'Priorité', ['haute', 'moyenne', 'basse'].map(p => `<option value="${p}" ${p === (x.priority || 'moyenne') ? 'selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`).join(''))}`;
}

/* ============================== Matières ============================== */
function vMatieres(r) {
  if (r[1]) return vMatiere(r[1]);
  return `
  <div class="section-head" style="margin-top:0"><div><div class="label">Licence 3</div><h1 style="font-size:46px;margin-top:8px">Matières</h1></div><button class="btn" data-act="subj-add">Nouvelle matière</button></div>
  <div class="subj-grid">
    ${S.subjects.map(s => {
      const m = memPct(s.id); const dc = dueCards(s.id).length;
      return `<a class="subj-card" href="#/matieres/${s.id}" style="--c:${s.color}">
        <div class="row between"><span class="label">${s.exam ? `Examen · ${fmtDate(s.exam)}` : 'Pas de date'}</span>${s.exam && s.exam >= today() ? `<span class="tag ${diffDays(today(), s.exam) <= 14 ? 'urgent' : ''}">J-${diffDays(today(), s.exam)}</span>` : ''}</div>
        <div class="t">${esc(s.name)}</div>
        <div class="stack small">
          <div><div class="row between"><span class="muted">Plan</span><span>${planPct(s)} %</span></div>${bar(planPct(s), '', s.color)}</div>
          <div><div class="row between"><span class="muted">Mémorisation</span><span>${m === null ? '—' : m + ' %'}</span></div>${bar(m, '', s.color)}</div>
        </div>
        <div class="row between small muted"><span>${s.parts.length} partie${s.parts.length > 1 ? 's' : ''} · ${s.fiches.length} fiche${s.fiches.length > 1 ? 's' : ''}</span><span>${dc ? `${dc} à réviser` : ''}</span></div>
      </a>`;
    }).join('')}
    <button class="subj-card add" data-act="subj-add">+ Ajouter une matière</button>
  </div>`;
}

function vMatiere(id) {
  const s = subj(id);
  if (!s) return `<a class="link back" href="#/matieres">← Matières</a><div class="empty">Matière introuvable.</div>`;
  const cs = cardsOf(s.id); const m = memOf(cs); const dc = dueCards(s.id).length;
  const ex = S.exercises.filter(e => e.subjectId === s.id);
  const mins = S.sessions.filter(x => x.subjectId === s.id).reduce((a, x) => a + x.minutes, 0);
  return `
  <a class="link back" href="#/matieres">← Matières</a>
  <div class="section-head" style="margin-top:0">
    <div><div class="label">${s.exam ? `Examen le ${fmtDateY(s.exam)}${s.exam >= today() ? ` · J-${diffDays(today(), s.exam)}` : ''}` : 'Aucune date d\'examen'}</div><h1 style="font-size:46px;margin-top:8px" class="row"><i class="sdot big" style="background:${s.color}"></i>${esc(s.name)}</h1></div>
    <div class="row"><button class="btn ghost" data-act="subj-edit" data-id="${s.id}">Modifier</button><a class="btn" href="#/revisions/session/${s.id}">Réviser${dc ? ` (${dc})` : ''}</a></div>
  </div>
  <div class="stat-row">
    <div><div class="label">Avancement du plan</div><div class="v">${planPct(s)} %</div>${bar(planPct(s), '', s.color)}</div>
    <div><div class="label">Mémorisation</div><div class="v">${m === null ? '—' : m + ' %'}</div>${bar(m, '', s.color)}</div>
    <div><div class="label">Cartes</div><div class="v">${cs.length}</div><div class="small muted">${dc} à réviser aujourd'hui</div></div>
    <div><div class="label">Temps travaillé</div><div class="v">${fmtMin(mins)}</div><div class="small muted">${ex.filter(e => e.status === 'done').length}/${ex.length} exercices faits</div></div>
  </div>

  <div class="grid g-main section">
    <div class="card">
      <div class="card-head"><h3>Plan du cours</h3><span class="label">Clique sur un niveau pour noter ta progression</span></div>
      ${s.parts.length ? `<ul class="list plan">${s.parts.map((p, i) => {
        const pc = cardsOf(s.id, p.id); const pm = memOf(pc);
        return `<li>
          <div class="grow"><div class="title part-title" data-act="part-rename" data-sid="${s.id}" data-id="${p.id}" title="Renommer">${esc(p.title)}</div>
          <div class="small muted">${pc.length ? `${pc.length} carte${pc.length > 1 ? 's' : ''} · mémorisé à ${pm} %` : 'Aucune carte'}</div></div>
          <div class="levels">${LEVELS.map((l, k) => `<button style="--c:${LEVEL_COLORS[k]}" class="${p.level === k ? 'on' : ''}" data-act="part-level" data-sid="${s.id}" data-id="${p.id}" data-level="${k}">${l}</button>`).join('')}</div>
          <div class="row" style="gap:2px">
            <button class="x" style="font-size:13px" data-act="part-move" data-sid="${s.id}" data-id="${p.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} title="Monter">↑</button>
            <button class="x" style="font-size:13px" data-act="part-move" data-sid="${s.id}" data-id="${p.id}" data-dir="1" ${i === s.parts.length - 1 ? 'disabled' : ''} title="Descendre">↓</button>
            <button class="x" data-act="part-del" data-sid="${s.id}" data-id="${p.id}" title="Supprimer">×</button>
          </div>
        </li>`;
      }).join('')}</ul>` : '<div class="empty">Ajoute les grandes parties du plan de ton cours.</div>'}
      <form class="inline-form" data-form="part-add" data-sid="${s.id}"><input name="title" placeholder="Nouvelle partie — ex. Partie 2 — Titre I — Chapitre 1" required><button class="btn">Ajouter</button></form>
      <div class="hint" style="margin-top:10px">Astuce : colle plusieurs lignes d'un coup (une partie par ligne) via « Coller un plan ». <button class="link" data-act="plan-paste" data-sid="${s.id}">Coller un plan</button></div>
    </div>

    <div>
      <div class="card">
        <div class="card-head"><h3>Fiches</h3><button class="link" data-act="fiche-add" data-sid="${s.id}">+ Ajouter</button></div>
        ${s.fiches.length ? `<ul class="list">${s.fiches.map(f => `<li style="align-items:flex-start">
          <div class="grow"><div class="title">${esc(f.title)}</div>
            ${f.location ? (/^https?:\/\//.test(f.location) ? `<a class="small" href="${esc(f.location)}" target="_blank" rel="noopener">Ouvrir le lien ↗</a>` : `<div style="margin-top:4px"><span class="path">${esc(f.location)}</span> <button class="link" data-act="copy" data-text="${esc(f.location)}">Copier</button></div>`) : ''}
            ${f.note ? `<div class="small muted" style="margin-top:4px">${esc(f.note)}</div>` : ''}</div>
          <button class="x" style="font-size:13px" data-act="fiche-edit" data-sid="${s.id}" data-id="${f.id}">✎</button>
        </li>`).join('')}</ul>` : '<div class="empty">Indique où se trouvent tes fiches (dossier, fichier, lien).</div>'}
      </div>
      <div class="card" style="margin-top:22px">
        <div class="card-head"><h3>Cartes de révision</h3></div>
        <p class="small muted" style="margin-top:0">${cs.length ? `${cs.length} cartes, dont ${cs.filter(c => c.box >= 4).length} bien ancrées.` : 'Pas encore de cartes pour cette matière.'}</p>
        <div class="row wrap"><a class="btn sm" href="#/revisions/ajout/${s.id}">Ajouter des cartes</a><a class="btn sm ghost" href="#/revisions/cartes/${s.id}">Voir les cartes</a></div>
      </div>
      <div class="card" style="margin-top:22px">
        <div class="card-head"><h3>Tâches</h3><button class="link" data-act="task-add" data-sid="${s.id}">+ Ajouter</button></div>
        ${S.tasks.filter(x => x.subjectId === s.id).length ? `<ul class="list">${S.tasks.filter(x => x.subjectId === s.id).sort((a, b) => a.done - b.done).map(taskRow).join('')}</ul>` : '<div class="empty">Aucune tâche.</div>'}
      </div>
    </div>
  </div>`;
}

function subjForm(s = {}) {
  return `${fText('name', 'Nom de la matière', s.name, 'required placeholder="Ex. Droit des contrats spéciaux"')}
  ${fText('exam', "Date de l'examen", s.exam || '', 'type="date"')}
  <div class="field"><span>Couleur</span><div class="swatches">${PALETTE.map((c, i) => `<label><input type="radio" name="color" value="${c}" ${c === (s.color || PALETTE[S.subjects.length % PALETTE.length]) ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div></div>
  ${s.id ? '' : fArea('parts', 'Plan (facultatif) — une partie par ligne', '', 'rows="5" placeholder="Introduction\nPartie 1 — …\nPartie 2 — …"')}`;
}

/* ============================== Révisions ============================== */
let R = null; // session de révision en cours

function vRevisions(r) {
  if (r[1] === 'session') return vReview(r[2]);
  if (r[1] === 'ajout') return vAddCards(r[2]);
  if (r[1] === 'cartes') return vCardList(r[2]);
  const due = dueCards().length;
  const total = S.cards.length;
  const mastered = S.cards.filter(c => c.box >= 4).length;
  return `
  <div class="section-head" style="margin-top:0">
    <div><div class="label">Rappel actif · répétition espacée</div><h1 style="font-size:46px;margin-top:8px">Révisions</h1></div>
    <div class="row"><a class="btn ghost" href="#/revisions/ajout">Ajouter des cartes</a><a class="btn" href="#/revisions/session">${due ? `Tout réviser (${due})` : 'Réviser'}</a></div>
  </div>
  <div class="stat-row">
    <div><div class="label">À réviser aujourd'hui</div><div class="v">${due}</div></div>
    <div><div class="label">Cartes au total</div><div class="v">${total}</div></div>
    <div><div class="label">Bien ancrées</div><div class="v">${mastered}</div><div class="small muted">revues avec succès 4 fois ou plus</div></div>
    <div><div class="label">Mémorisation moyenne</div><div class="v">${total ? memOf(S.cards) + ' %' : '—'}</div>${bar(memOf(S.cards))}</div>
  </div>

  <div class="card section">
    <div class="card-head"><h3>Par matière</h3><a class="link" href="#/revisions/cartes">Toutes les cartes</a></div>
    <table class="table">
      <thead><tr><th>Matière</th><th>Cartes</th><th>À réviser</th><th class="w-bar">Mémorisation</th><th></th></tr></thead>
      <tbody>${S.subjects.map(s => {
        const cs = cardsOf(s.id); const m = memOf(cs); const dc = dueCards(s.id).length;
        return `<tr><td>${dotOf(s.id)}<a href="#/matieres/${s.id}" class="serif" style="font-size:18px;text-decoration:none">${esc(s.name)}</a></td><td>${cs.length}</td>
          <td>${dc ? `<span class="tag soon">${dc}</span>` : '<span class="muted">0</span>'}</td>
          <td class="w-bar"><div class="row"><div style="flex:1">${bar(m, '', s.color)}</div><span class="small">${m === null ? '—' : m + ' %'}</span></div></td>
          <td style="text-align:right;white-space:nowrap"><a class="link" href="#/revisions/ajout/${s.id}">Ajouter</a>&nbsp;&nbsp;<a class="btn sm ${dc ? '' : 'ghost'}" href="#/revisions/session/${s.id}">Réviser</a></td></tr>
          ${s.parts.filter(p => cardsOf(s.id, p.id).length).map(p => { const pc = cardsOf(s.id, p.id); const pm = memOf(pc); const pd = pc.filter(isDue).length;
            return `<tr class="small"><td style="padding-left:28px" class="muted">↳ ${esc(p.title)}</td><td class="muted">${pc.length}</td><td class="muted">${pd || ''}</td><td class="w-bar"><div class="row"><div style="flex:1">${bar(pm, '', s.color)}</div><span>${pm} %</span></div></td><td style="text-align:right">${pd ? `<a class="link" href="#/revisions/session/${s.id}/${p.id}">Réviser</a>` : ''}</td></tr>`; }).join('')}`;
      }).join('')}</tbody>
    </table>
  </div>
  <div class="note section" style="margin-top:22px">Fonctionnement : chaque carte revue avec succès revient de plus en plus tard (1, 3, 7, 14, 30 puis 60 jours). Une carte ratée revient dans la séance, puis le lendemain.</div>`;
}

function startReview(sid, pid) {
  let pool = S.cards.filter(c => isDue(c) && (!sid || c.subjectId === sid) && (!pid || c.partId === pid));
  pool = pool.sort((a, b) => a.box - b.box || a.due.localeCompare(b.due));
  R = { sid, pid, queue: pool.map(c => c.id), idx: 0, flipped: false, stats: { again: 0, hard: 0, good: 0, easy: 0 }, key: `${sid || ''}/${pid || ''}` };
}

function vReview(sid) {
  const pid = route()[3];
  const key = `${sid || ''}/${pid || ''}`;
  if (!R || R.key !== key) startReview(sid, pid);
  const label = sid ? subjName(sid) : 'Toutes les matières';
  if (!R.queue.length) {
    const ahead = S.cards.filter(c => (!sid || c.subjectId === sid)).length;
    return `<div class="review"><a class="link back" href="#/revisions">← Révisions</a>
      <div class="flash"><div class="q">Rien à réviser pour l'instant.</div><p class="muted">${ahead ? 'Toutes les cartes sont à jour. Reviens demain, ou ajoute de nouvelles cartes.' : 'Ajoute tes premières cartes pour commencer.'}</p>
      <div class="row" style="justify-content:center"><a class="btn" href="#/revisions/ajout/${sid || ''}">Ajouter des cartes</a>${ahead ? `<button class="btn ghost" data-act="review-ahead" data-sid="${sid || ''}">Réviser quand même</button>` : ''}</div></div></div>`;
  }
  if (R.idx >= R.queue.length) {
    const st = R.stats; const n = st.again + st.hard + st.good + st.easy;
    return `<div class="review"><a class="link back" href="#/revisions">← Révisions</a>
      <div class="flash"><div class="label">Séance terminée · ${esc(label)}</div><div class="q">${n} réponse${n > 1 ? 's' : ''} données.</div>
      <div class="row" style="justify-content:center;gap:18px">
        <span class="tag late">À revoir ${st.again}</span><span class="tag soon">Difficile ${st.hard}</span><span class="tag">Su ${st.good}</span><span class="tag ok">Facile ${st.easy}</span></div>
      <div class="row" style="justify-content:center"><a class="btn" href="#/accueil">Tableau de bord</a><button class="btn ghost" data-act="review-restart">Nouvelle séance</button></div></div></div>`;
  }
  const c = S.cards.find(x => x.id === R.queue[R.idx]);
  if (!c) { R.idx++; return vReview(sid); }
  const part = subj(c.subjectId)?.parts.find(p => p.id === c.partId);
  return `<div class="review">
    <div class="row between"><a class="link" href="#/revisions">← Quitter</a><span class="label">${esc(label)} · ${R.idx + 1} / ${R.queue.length}</span></div>
    <div style="margin-top:14px">${bar(R.idx / R.queue.length * 100)}</div>
    <div class="flash" style="--c:${colorOf(c.subjectId)}">
      <div class="label">${esc(subjName(c.subjectId))}${part ? ' · ' + esc(part.title) : ''}</div>
      <div class="q">${esc(c.q)}</div>
      ${R.flipped ? `<div class="a">${esc(c.a)}</div>` : ''}
    </div>
    ${R.flipped ? `<div class="grades">
      <button class="btn again" data-act="grade" data-g="again">À revoir<small>revient dans la séance</small></button>
      <button class="btn hard" data-act="grade" data-g="hard">Difficile<small>demain</small></button>
      <button class="btn good" data-act="grade" data-g="good">Su<small>dans ${INTERVALS[Math.min(c.box + 1, 6)]} j</small></button>
      <button class="btn easy" data-act="grade" data-g="easy">Facile<small>dans ${INTERVALS[Math.min(c.box + 2, 6)]} j</small></button>
    </div><p class="small muted" style="text-align:center">Raccourcis : 1 · 2 · 3 · 4</p>`
    : `<div style="text-align:center;margin-top:16px"><button class="btn lg" data-act="flip">Afficher la réponse <span class="kbd">Espace</span></button></div>
       <p class="small muted" style="text-align:center">Formule ta réponse à voix haute ou par écrit avant de retourner la carte.</p>`}
  </div>`;
}

function grade(g) {
  const c = S.cards.find(x => x.id === R.queue[R.idx]); if (!c) return;
  const t = today();
  c.reviews = (c.reviews || 0) + 1; c.last = t;
  if (g === 'again') { c.box = 0; c.due = t; c.lapses = (c.lapses || 0) + 1; R.queue.push(c.id); }
  else if (g === 'hard') { c.box = Math.max(1, c.box); c.due = addDays(t, 1); }
  else if (g === 'good') { c.box = Math.min(c.box + 1, 6); c.due = addDays(t, INTERVALS[c.box]); }
  else if (g === 'easy') { c.box = Math.min(c.box + 2, 6); c.due = addDays(t, INTERVALS[c.box]); }
  R.stats[g]++; R.idx++; R.flipped = false;
  commit();
}

const PROMPT_CARDS = (sub, part) => `Tu es mon assistant de révision en Licence 3 de droit.
À partir du cours ci-dessous, crée 20 flashcards de rappel actif : définitions, conditions d'application, arrêts (juridiction, date, apport), articles clés, distinctions entre notions, exceptions.

FORMAT STRICT : une carte par ligne, sous la forme
question :: réponse
Sans numérotation, sans titre, sans ligne vide, sans gras.
Réponses courtes (1 à 3 phrases), exactes, avec les références précises.

Matière : ${sub || '[MATIÈRE]'}${part ? `\nPartie : ${part}` : ''}

Cours :
[COLLE TON COURS ICI]`;

function parseCards(txt) {
  txt = txt.trim();
  if (txt.startsWith('[')) {
    try { return JSON.parse(txt).map(o => ({ q: String(o.q || o.question || '').trim(), a: String(o.a || o.answer || o.reponse || o['réponse'] || '').trim() })).filter(o => o.q && o.a); } catch {}
  }
  return txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    let i = l.indexOf('::'), w = 2;
    if (i < 0) { i = l.indexOf('\t'); w = 1; }
    if (i < 0) return null;
    return { q: l.slice(0, i).replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, '').replace(/\*\*/g, '').trim(), a: l.slice(i + w).replace(/\*\*/g, '').trim() };
  }).filter(o => o && o.q && o.a);
}

function vAddCards(sid) {
  sid = sid || S.subjects[0]?.id || '';
  const s = subj(sid);
  return `
  <a class="link back" href="#/revisions">← Révisions</a>
  <h1 style="font-size:46px">Ajouter des cartes</h1>
  <div class="grid g2 section" style="margin-top:28px">
    <div class="card">
      <div class="card-head"><h3>Importer depuis Claude</h3></div>
      <ol class="small" style="padding-left:18px;color:var(--ink2);margin-top:0">
        <li>Copie la consigne ci-dessous et colle-la dans Claude avec ton cours.</li>
        <li>Copie la réponse de Claude et colle-la dans le champ d'import.</li>
      </ol>
      <div class="prompt-box" id="prompt-cards">${esc(PROMPT_CARDS(s?.name))}</div>
      <div style="margin:10px 0 22px"><button class="btn sm ghost" data-act="copy-prompt-cards">Copier la consigne</button></div>
      <form data-form="cards-import">
        <div class="fields2">${fSel('subjectId', 'Matière', subjOptions(sid, null), 'data-change="cards-subject" required')}${fSel('partId', 'Partie', partOptions(sid))}</div>
        ${fArea('text', 'Réponse de Claude', '', 'rows="8" required placeholder="Question :: Réponse\nQuestion :: Réponse"')}
        <button class="btn">Importer les cartes</button>
      </form>
    </div>
    <div class="card">
      <div class="card-head"><h3>Créer une carte</h3></div>
      <form data-form="card-add">
        <div class="fields2">${fSel('subjectId', 'Matière', subjOptions(sid, null), 'data-change="cards-subject" required')}${fSel('partId', 'Partie', partOptions(sid))}</div>
        ${fArea('q', 'Question', '', 'rows="3" required placeholder="Ex. Conditions de la responsabilité du fait des choses ?"')}
        ${fArea('a', 'Réponse', '', 'rows="5" required')}
        <button class="btn">Ajouter la carte</button>
      </form>
    </div>
  </div>`;
}

function vCardList(sid) {
  const q = (vCardList.q || '').toLowerCase();
  const list = S.cards.filter(c => (!sid || c.subjectId === sid) && (!q || (c.q + ' ' + c.a).toLowerCase().includes(q)));
  return `
  <a class="link back" href="#/revisions">← Révisions</a>
  <div class="section-head" style="margin-top:0"><h1 style="font-size:46px">Cartes${sid ? ` · ${esc(subjName(sid))}` : ''}</h1><a class="btn" href="#/revisions/ajout/${sid || ''}">Ajouter</a></div>
  <div class="row" style="margin-bottom:18px">
    <select data-change="cardlist-subject" style="max-width:280px">${subjOptions(sid, 'Toutes les matières')}</select>
    <input type="search" placeholder="Rechercher…" value="${esc(vCardList.q || '')}" data-input="cardlist-q" style="max-width:320px">
    <span class="muted small">${list.length} carte${list.length > 1 ? 's' : ''}</span>
  </div>
  <div class="card">${list.length ? `<ul class="list">${list.map(c => `<li style="align-items:flex-start">
    <div class="grow"><div class="card-q">${esc(c.q)}</div><div class="card-a">${esc(c.a)}</div>
    <div class="small muted" style="margin-top:4px">${esc(subjName(c.subjectId))} · ${isDue(c) ? 'à réviser' : `prochaine révision ${fmtDate(c.due)}`} · niveau ${Math.min(c.box, 5)}/5</div></div>
    <button class="x" style="font-size:13px" data-act="card-edit" data-id="${c.id}">✎</button><button class="x" data-act="card-del" data-id="${c.id}">×</button></li>`).join('')}</ul>` : '<div class="empty">Aucune carte.</div>'}</div>`;
}

/* ============================== Entraînement ============================== */
let Q = null; // QCM en cours
let EX = null; // chrono exercice

function vEntrainement(r) {
  const tab = r[1] || 'qcm';
  if (tab === 'qcm' && r[2] === 'session') return vQuiz();
  if (tab === 'exercice' && r[2]) return vExercise(r[2]);
  const tabs = `<div class="tabs">${[['qcm', 'QCM'], ['annales', 'Annales'], ['cas', 'Cas pratiques']].map(([k, l]) => `<a href="#/entrainement/${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</div>`;
  const head = `<div class="label">S'entraîner en conditions réelles</div><h1 style="font-size:46px;margin:8px 0 26px">Entraînement</h1>`;
  if (tab === 'qcm') return head + tabs + vQcmHome();
  return head + tabs + vExList(tab === 'annales' ? 'annale' : 'cas');
}

const PROMPT_QCM = sub => `Tu es mon assistant de révision en Licence 3 de droit.
À partir du cours ci-dessous, crée 15 questions à choix multiples (une seule bonne réponse, 4 propositions plausibles).

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, au format :
[{"q":"Question ?","options":["A","B","C","D"],"answer":0,"explanation":"Pourquoi c'est la bonne réponse, avec la référence."}]
"answer" est l'index (0 à 3) de la bonne réponse. Varie sa position.

Matière : ${sub || '[MATIÈRE]'}

Cours :
[COLLE TON COURS ICI]`;

function parseQcm(txt) {
  const a = txt.indexOf('['), b = txt.lastIndexOf(']');
  if (a < 0 || b < a) throw new Error('Aucun tableau JSON trouvé');
  const arr = JSON.parse(txt.slice(a, b + 1));
  return arr.map(o => {
    const options = (o.options || o.choices || o.propositions || []).map(String);
    let answer = o.answer ?? o.correct ?? o.reponse;
    if (typeof answer === 'string') { const i = options.indexOf(answer); answer = i >= 0 ? i : 'ABCD'.indexOf(answer.toUpperCase()); }
    return { q: String(o.q || o.question || '').trim(), options, answer: Number(answer), explanation: String(o.explanation || o.explication || '') };
  }).filter(o => o.q && o.options.length >= 2 && o.answer >= 0 && o.answer < o.options.length);
}

function vQcmHome() {
  const sid0 = S.subjects[0]?.id || '';
  const done = S.qcm.reduce((a, x) => a + (x.seen || 0), 0);
  const ok = S.qcm.reduce((a, x) => a + (x.correct || 0), 0);
  return `
  <div class="grid g2">
    <div class="card">
      <div class="card-head"><h3>Lancer un QCM</h3><span class="label">${S.qcm.length} questions · ${done ? Math.round(ok / done * 100) + ' % de réussite' : 'jamais lancé'}</span></div>
      <form data-form="quiz-start">
        <div class="fields2">${fSel('subjectId', 'Matière', subjOptions('', 'Toutes les matières'))}${fSel('n', 'Nombre de questions', [5, 10, 15, 20, 30].map(n => `<option ${n === 10 ? 'selected' : ''}>${n}</option>`).join(''))}</div>
        ${fSel('mode', 'Priorité', '<option value="weak">Questions les moins réussies d\'abord</option><option value="random">Au hasard</option>')}
        <button class="btn">Commencer</button>
      </form>
      <table class="table" style="margin-top:22px"><thead><tr><th>Matière</th><th>Questions</th><th>Réussite</th></tr></thead><tbody>
        ${S.subjects.map(s => { const qs = S.qcm.filter(x => x.subjectId === s.id); const se = qs.reduce((a, x) => a + (x.seen || 0), 0), co = qs.reduce((a, x) => a + (x.correct || 0), 0);
          return `<tr><td>${esc(s.name)}</td><td>${qs.length}</td><td>${se ? Math.round(co / se * 100) + ' %' : '—'}</td></tr>`; }).join('')}
      </tbody></table>
    </div>
    <div class="card">
      <div class="card-head"><h3>Importer des QCM depuis Claude</h3></div>
      <div class="prompt-box">${esc(PROMPT_QCM())}</div>
      <div style="margin:10px 0 22px"><button class="btn sm ghost" data-act="copy" data-text="${esc(PROMPT_QCM())}">Copier la consigne</button></div>
      <form data-form="qcm-import">
        ${fSel('subjectId', 'Matière', subjOptions(sid0, null), 'required')}
        ${fArea('text', 'Réponse de Claude (JSON)', '', 'rows="7" required placeholder=\'[{"q":"…","options":["…","…","…","…"],"answer":0,"explanation":"…"}]\'')}
        <button class="btn">Importer</button>
      </form>
    </div>
  </div>`;
}

function vQuiz() {
  if (!Q) return `<a class="link back" href="#/entrainement/qcm">← Entraînement</a><div class="empty">Aucun QCM en cours.</div>`;
  if (Q.idx >= Q.items.length) {
    const pct = Math.round(Q.score / Q.items.length * 100);
    return `<div class="review"><a class="link back" href="#/entrainement/qcm">← Entraînement</a>
      <div class="flash"><div class="label">Résultat</div><div class="q" style="font-size:64px">${Q.score} / ${Q.items.length}</div>
      <p class="muted">${pct >= 80 ? 'Très solide.' : pct >= 50 ? 'Correct — revois les erreurs ci-dessous.' : 'À retravailler : repasse par les fiches concernées.'}</p>
      ${Q.wrong.length ? `<div style="text-align:left"><div class="label" style="margin-bottom:8px">Erreurs</div><ul class="list">${Q.wrong.map(w => { const x = S.qcm.find(y => y.id === w); return x ? `<li style="display:block"><div class="card-q">${esc(x.q)}</div><div class="small" style="color:var(--olive)">✓ ${esc(x.options[x.answer])}</div>${x.explanation ? `<div class="small muted">${esc(x.explanation)}</div>` : ''}</li>` : ''; }).join('')}</ul></div>` : ''}
      <div class="row" style="justify-content:center"><button class="btn" data-act="quiz-again">Recommencer</button><a class="btn ghost" href="#/entrainement/qcm">Terminer</a></div></div></div>`;
  }
  const x = S.qcm.find(y => y.id === Q.items[Q.idx]);
  const ans = Q.answered;
  return `<div class="review">
    <div class="row between"><a class="link" href="#/entrainement/qcm">← Quitter</a><span class="label">Question ${Q.idx + 1} / ${Q.items.length} · score ${Q.score}</span></div>
    <div style="margin-top:14px">${bar(Q.idx / Q.items.length * 100)}</div>
    <div class="flash" style="text-align:left;min-height:0">
      <div class="label">${esc(subjName(x.subjectId))}</div>
      <div class="q" style="font-size:26px">${esc(x.q)}</div>
      <div class="opts">${x.options.map((o, i) => `<button class="opt ${ans !== null ? (i === x.answer ? 'right' : i === ans ? 'wrong' : '') : ''}" data-act="quiz-answer" data-i="${i}" ${ans !== null ? 'disabled' : ''}><span class="k">${'ABCDEF'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>
      ${ans !== null && x.explanation ? `<div class="explain">${esc(x.explanation)}</div>` : ''}
    </div>
    ${ans !== null ? `<div style="text-align:right;margin-top:16px"><button class="btn lg" data-act="quiz-next">${Q.idx + 1 < Q.items.length ? 'Question suivante' : 'Voir le résultat'} →</button></div>` : ''}
  </div>`;
}

function vExList(type) {
  const list = S.exercises.filter(e => e.type === type).sort((a, b) => (a.status === 'done') - (b.status === 'done'));
  const label = type === 'annale' ? 'annale' : 'cas pratique';
  return `
  <div class="row between" style="margin-bottom:18px">
    <p class="muted" style="margin:0;max-width:640px">${type === 'annale' ? "Recense les sujets d'examen des années précédentes, travaille-les en temps limité et note ton résultat." : 'Petits cas pratiques pour t\'entraîner à la méthode : faits, problème de droit, majeure, mineure, conclusion.'}</p>
    <div class="row">${type === 'cas' ? `<button class="btn ghost" data-act="copy" data-text="${esc(PROMPT_CAS)}">Consigne Claude</button>` : ''}<button class="btn" data-act="ex-add" data-type="${type}">Ajouter ${type === 'annale' ? 'une annale' : 'un cas'}</button></div>
  </div>
  <div class="card">${list.length ? `<table class="table"><thead><tr><th>Sujet</th><th>Matière</th>${type === 'annale' ? '<th>Année</th>' : ''}<th>Statut</th><th>Note</th><th></th></tr></thead><tbody>
    ${list.map(e => `<tr><td><span class="serif" style="font-size:17px">${esc(e.title)}</span>${e.location ? `<div class="small muted">${esc(e.location)}</div>` : ''}</td><td>${dotOf(e.subjectId)}${esc(subjName(e.subjectId))}</td>${type === 'annale' ? `<td>${esc(e.year)}</td>` : ''}
      <td>${e.status === 'done' ? '<span class="tag ok">Fait</span>' : '<span class="tag">À faire</span>'}</td><td>${e.score !== null && e.score !== '' ? `<span class="serif" style="font-size:18px">${esc(e.score)}</span><span class="muted small"> /20</span>` : '—'}</td>
      <td style="text-align:right;white-space:nowrap"><button class="x" style="font-size:13px" data-act="ex-edit" data-id="${e.id}">✎</button> <a class="btn sm ${e.status === 'done' ? 'ghost' : ''}" href="#/entrainement/exercice/${e.id}">${e.status === 'done' ? 'Revoir' : 'Commencer'}</a></td></tr>`).join('')}
  </tbody></table>` : `<div class="empty">Aucun ${label} pour l'instant.</div>`}</div>`;
}

const PROMPT_CAS = `Tu es chargé de TD en Licence 3 de droit.
Rédige un cas pratique d'entraînement (15 à 20 lignes de faits) sur le thème : [THÈME / CHAPITRE].
Donne d'abord l'énoncé seul. Puis, après une ligne "— CORRIGÉ —", les éléments de correction : problèmes de droit, règles applicables (articles, jurisprudence), application aux faits, solution.`;

function vExercise(id) {
  const e = S.exercises.find(x => x.id === id);
  if (!e) return `<a class="link back" href="#/entrainement">← Entraînement</a><div class="empty">Exercice introuvable.</div>`;
  if (!EX || EX.id !== id) EX = { id, start: Date.now() };
  const back = e.type === 'annale' ? 'annales' : 'cas';
  return `
  <a class="link back" href="#/entrainement/${back}">← ${e.type === 'annale' ? 'Annales' : 'Cas pratiques'}</a>
  <div class="section-head" style="margin-top:0"><div><div class="label">${esc(subjName(e.subjectId))}${e.year ? ' · ' + esc(e.year) : ''}</div><h1 style="font-size:40px;margin-top:8px">${esc(e.title)}</h1></div>
    <div class="row"><span class="serif" style="font-size:30px;font-variant-numeric:tabular-nums" id="ex-clock">00:00</span><button class="btn" data-act="ex-finish" data-id="${e.id}">Terminer</button></div></div>
  <div class="grid g2">
    <div class="card">
      <div class="card-head"><h3>Sujet</h3>${e.location ? `<span class="small">${/^https?:/.test(e.location) ? `<a href="${esc(e.location)}" target="_blank" rel="noopener">Ouvrir ↗</a>` : `<span class="path">${esc(e.location)}</span>`}</span>` : ''}</div>
      ${e.enonce ? `<div style="white-space:pre-wrap;font-size:15px;line-height:1.7">${esc(e.enonce)}</div>` : `<div class="empty">Ouvre le sujet${e.location ? ' indiqué ci-dessus' : ''} et lance-toi.</div>`}
      ${e.notes ? `<div class="explain"><strong>Mes remarques :</strong> ${esc(e.notes)}</div>` : ''}
    </div>
    <div class="card">
      <div class="card-head"><h3>Brouillon</h3><span class="label">Enregistré automatiquement</span></div>
      <textarea data-input="ex-draft" data-id="${e.id}" rows="18" placeholder="Faits → Problème de droit → Majeure → Mineure → Conclusion">${esc(e.draft || '')}</textarea>
    </div>
  </div>`;
}

/* ============================== Concentration (saisie du temps) ============================== */
// Le temps est suivi dans un outil externe : ici on le saisit simplement (ex. « 7 h de travail aujourd'hui »).
function tickExClock() {
  const ec = $('#ex-clock'); if (!ec || !EX) return;
  const s = Math.floor((Date.now() - EX.start) / 1000);
  ec.textContent = s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
const starsField = (v = 3) => `<div class="stars">${[1, 2, 3, 4, 5].map(i => `<label><input type="radio" name="focus" value="${i}" ${i === v ? 'checked' : ''}><span>${i}</span></label>`).join('')}</div><div class="small muted" style="margin-top:6px">1 = très dispersée · 5 = concentration totale</div>`;
function addSession(x) { S.sessions.push({ id: uid(), ...x }); commit(); }
const sessionFields = (x = {}) => {
  const h = x.minutes ? Math.floor(x.minutes / 60) : '', m = x.minutes ? x.minutes % 60 : '';
  return `<div class="fields2">${fText('date', 'Date', x.date || today(), 'type="date" required')}${fSel('subjectId', 'Matière (facultatif)', subjOptions(x.subjectId || '', 'Toutes / non précisée'))}</div>
  <div class="fields2">${fText('h', 'Heures', h, 'type="number" min="0" max="24" placeholder="7"')}${fText('m', 'Minutes', m, 'type="number" min="0" max="59" step="5" placeholder="30"')}</div>
  <div class="field"><span>Niveau de concentration</span>${starsField(x.focus || 3)}</div>
  ${fText('note', 'Note (facultatif)', x.note || '', 'placeholder="Ex. matinée très productive, distraite l\'après-midi…"')}`;
};
const readSession = fd => {
  const minutes = (Number(fd.h) || 0) * 60 + (Number(fd.m) || 0);
  if (minutes < 1) { toast('Indique une durée'); return null; }
  return { date: fd.date, minutes, subjectId: fd.subjectId, focus: Number(fd.focus || 3), note: (fd.note || '').trim() };
};

function vConcentration() {
  const t = today(); const goal = S.settings.focusGoal;
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const mins = days.map(d => minutesOn(d));
  const max = Math.max(goal, ...mins, 1);
  const week = mins.reduce((a, b) => a + b, 0);
  const last7 = S.sessions.filter(x => x.date >= days[0]);
  const focusAvg = last7.length ? (last7.reduce((a, x) => a + x.minutes * x.focus, 0) / last7.reduce((a, x) => a + x.minutes, 0)) : 0;
  const bySubj = S.subjects.map(s => ({ s, m: last7.filter(x => x.subjectId === s.id).reduce((a, x) => a + x.minutes, 0) })).filter(x => x.m).sort((a, b) => b.m - a.m);
  const noSubj = last7.filter(x => !x.subjectId).reduce((a, x) => a + x.minutes, 0);
  if (noSubj) bySubj.push({ s: { name: 'Non précisée' }, m: noSubj });
  const daysOk = mins.filter(m => m >= goal).length;
  return `
  <div class="section-head" style="margin-top:0"><div><div class="label">Temps de travail & focus</div><h1 style="font-size:46px;margin-top:8px">Concentration</h1></div>
    <button class="btn ghost" data-act="goals-edit">Objectifs</button></div>
  <div class="grid g2">
    <div class="card">
      <div class="card-head"><h3>Saisir mon temps</h3><span class="label">Depuis ton outil de suivi</span></div>
      <form data-form="session-add">${sessionFields()}<button class="btn">Enregistrer</button></form>
    </div>
    <div class="card">
      <div class="card-head"><h3>Aujourd'hui</h3><span class="label">Objectif ${fmtMin(goal)}</span></div>
      <div class="serif" style="font-size:54px;line-height:1">${fmtMin(minutesOn(t))}</div>
      <div style="margin:14px 0 22px">${bar(minutesOn(t) / goal * 100, 'thick', minutesOn(t) >= goal ? '#5E8C61' : '#D49A2A')}</div>
      <div class="grid g3" style="gap:0;border-top:1px solid var(--line)">
        <div style="padding-top:14px"><div class="label">7 jours</div><div class="serif" style="font-size:26px">${fmtMin(week)}</div><div class="small muted">obj. ${fmtMin(S.settings.weekGoal)}</div></div>
        <div style="padding-top:14px"><div class="label">Focus moyen</div><div class="serif" style="font-size:26px">${focusAvg ? focusAvg.toFixed(1) : '—'}<span class="small muted"> /5</span></div></div>
        <div style="padding-top:14px"><div class="label">Objectif atteint</div><div class="serif" style="font-size:26px">${daysOk} / 7</div><div class="small muted">jours</div></div>
      </div>
    </div>
  </div>
  <div class="grid g-main section">
    <div class="card">
      <div class="card-head"><h3>7 derniers jours</h3></div>
      <div class="chart">
        <div class="goal-line" style="bottom:${goal / max * 100}%"><span>objectif</span></div>
        ${days.map((d, i) => `<div class="col"><em>${mins[i] ? fmtMin(mins[i]) : ''}</em><div class="b ${mins[i] >= goal ? 'goal-ok' : ''}" style="height:${mins[i] / max * 100}%"></div></div>`).join('')}
      </div>
      <div class="row" style="gap:12px;margin-top:6px">${days.map(d => `<div style="flex:1;text-align:center" class="label">${parseD(d).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</div>`).join('')}</div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Par matière</h3><span class="label">7 jours</span></div>
      ${bySubj.length ? bySubj.map(x => `<div style="margin-bottom:14px"><div class="row between small"><span>${x.s.id ? dotOf(x.s.id) : ''}${esc(x.s.name)}</span><span>${fmtMin(x.m)}</span></div>${bar(x.m / week * 100, '', x.s.color || '#B9AE9E')}</div>`).join('') : '<div class="empty">Rien de saisi cette semaine.</div>'}
    </div>
  </div>
  <div class="card section">
    <div class="card-head"><h3>Historique</h3></div>
    ${S.sessions.length ? `<table class="table"><thead><tr><th>Date</th><th>Durée</th><th>Matière</th><th>Focus</th><th>Note</th><th></th></tr></thead><tbody>
      ${[...S.sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map(x => `<tr><td>${fmtDate(x.date)}</td><td>${fmtMin(x.minutes)}</td><td>${x.subjectId ? esc(subjName(x.subjectId)) : '—'}</td><td>${'●'.repeat(x.focus)}<span class="muted">${'○'.repeat(5 - x.focus)}</span></td><td class="small muted">${esc(x.note || '')}</td><td style="text-align:right;white-space:nowrap"><button class="x" style="font-size:13px" data-act="session-edit" data-id="${x.id}">✎</button><button class="x" data-act="session-del" data-id="${x.id}">×</button></td></tr>`).join('')}
    </tbody></table>` : '<div class="empty">Saisis ton premier temps de travail ci-dessus.</div>'}
  </div>`;
}

/* ============================== Habitudes ============================== */
function streakOf(hid) {
  let n = 0, d = today();
  if (!(S.habitLog[d] || []).includes(hid)) d = addDays(d, -1);
  while ((S.habitLog[d] || []).includes(hid)) { n++; d = addDays(d, -1); }
  return n;
}
function vHabitudes() {
  const t = today(); const days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const doneToday = (S.habitLog[t] || []).length;
  const rate7 = S.habits.length ? Math.round(days.reduce((a, d) => a + (S.habitLog[d] || []).filter(id => S.habits.some(h => h.id === id)).length, 0) / (S.habits.length * 7) * 100) : 0;
  return `
  <div class="section-head" style="margin-top:0"><div><div class="label">Hygiène de vie</div><h1 style="font-size:46px;margin-top:8px">Habitudes</h1></div><button class="btn" data-act="habit-add">Nouvelle habitude</button></div>
  <div class="stat-row" style="grid-template-columns:repeat(3,1fr)">
    <div><div class="label">Aujourd'hui</div><div class="v">${doneToday} / ${S.habits.length}</div>${bar(S.habits.length ? doneToday / S.habits.length * 100 : 0)}</div>
    <div><div class="label">Régularité 7 jours</div><div class="v">${rate7} %</div>${bar(rate7)}</div>
    <div><div class="label">Meilleure série en cours</div><div class="v">${Math.max(0, ...S.habits.map(h => streakOf(h.id)))} j</div></div>
  </div>
  ${MOMENTS.map(([k, l]) => { const hs = S.habits.filter(h => h.moment === k); return `
  <div class="card section" style="margin-top:22px;--c:${MOMENT_COLORS[k]}">
    <div class="moment-title"><i class="sdot big" style="background:${MOMENT_COLORS[k]}"></i><h3>${l}</h3><span class="label">${hs.filter(h => (S.habitLog[t] || []).includes(h.id)).length} / ${hs.length}</span></div>
    ${hs.length ? hs.map(h => { const on = (S.habitLog[t] || []).includes(h.id); return `<div class="habit-row">
      <input type="checkbox" class="chk" ${on ? 'checked' : ''} data-act="habit-toggle" data-id="${h.id}" data-date="${t}">
      <span class="${on ? 'muted' : ''}" style="${on ? 'text-decoration:line-through' : ''}">${esc(h.name)}</span>
      <div class="dots">${days.map(d => `<button class="${(S.habitLog[d] || []).includes(h.id) ? 'on' : ''} ${d === t ? 'today' : ''}" data-act="habit-toggle" data-id="${h.id}" data-date="${d}" title="${fmtDate(d)}">${parseD(d).toLocaleDateString('fr-FR', { weekday: 'narrow' })}</button>`).join('')}</div>
      <span class="streak">${streakOf(h.id)} j</span>
      <button class="x" data-act="habit-del" data-id="${h.id}">×</button>
    </div>`; }).join('') : '<div class="empty">Aucune habitude.</div>'}
  </div>`; }).join('')}`;
}

/* ============================== Ressources ============================== */
const LEGAL = [
  { k: 'legifrance', t: 'Légifrance', d: 'Codes, lois, décrets, jurisprudence', url: 'https://www.legifrance.gouv.fr/', search: q => `https://www.legifrance.gouv.fr/search/all?tab_selection=all&searchField=ALL&query=${encodeURIComponent(q)}` },
  { k: 'judilibre', t: 'Judilibre', d: 'Décisions de la Cour de cassation', url: 'https://www.courdecassation.fr/recherche-judilibre', search: q => `https://www.courdecassation.fr/recherche-judilibre?search_api_fulltext=${encodeURIComponent(q)}` },
  { k: 'ariane', t: 'ArianeWeb', d: "Jurisprudence du Conseil d'État", url: 'https://www.conseil-etat.fr/arianeweb/' },
  { k: 'cc', t: 'Conseil constitutionnel', d: 'Décisions QPC et DC', url: 'https://www.conseil-constitutionnel.fr/decisions' },
  { k: 'eurlex', t: 'EUR-Lex', d: "Droit de l'Union européenne", url: 'https://eur-lex.europa.eu/', search: q => `https://eur-lex.europa.eu/search.html?scope=EURLEX&text=${encodeURIComponent(q)}&lang=fr&type=quick` },
  { k: 'hudoc', t: 'HUDOC', d: 'Arrêts de la CEDH', url: 'https://hudoc.echr.coe.int/fre' },
];
function vRessources() {
  const groups = [['', 'Général'], ...S.subjects.map(s => [s.id, s.name])].map(([id, name]) => ({ id, name, items: S.resources.filter(r => (r.subjectId || '') === id) })).filter(g => g.items.length);
  return `
  <div class="section-head" style="margin-top:0"><div><div class="label">Documents & recherche juridique</div><h1 style="font-size:46px;margin-top:8px">Ressources</h1></div><button class="btn" data-act="res-add">Ajouter une ressource</button></div>
  <form class="search-bar" data-form="legal-search">
    <span class="serif" style="color:var(--paper);font-size:22px;white-space:nowrap">Recherche juridique</span>
    <input name="q" placeholder="Ex. article 1240 code civil, responsabilité du fait des choses…" required>
    <select name="src">${LEGAL.filter(l => l.search).map(l => `<option value="${l.k}">${l.t}</option>`).join('')}</select>
    <button class="btn light">Rechercher ↗</button>
  </form>
  <div class="quick">${LEGAL.map((l, i) => `<a style="--c:${PALETTE[i]}" href="${l.url}" target="_blank" rel="noopener"><span class="t">${l.t} ↗</span><span class="small muted">${l.d}</span></a>`).join('')}</div>

  <div class="section">
    <div class="section-head"><h2>Mes documents</h2><span class="small muted" style="max-width:440px;text-align:right">Pour des raisons de sécurité, un site web ne peut pas ouvrir directement un fichier de ton PC : copie le chemin et colle-le dans l'Explorateur de fichiers.</span></div>
    ${groups.length ? groups.map(g => `<div class="card" style="margin-bottom:18px"><div class="card-head"><h3>${esc(g.name)}</h3></div><ul class="list">${g.items.map(r => `<li>
      <span class="tag">${{ lien: 'Lien', fichier: 'Fichier', dossier: 'Dossier' }[r.kind] || r.kind}</span>
      <div class="grow"><div class="title">${esc(r.title)}</div>${r.note ? `<div class="small muted">${esc(r.note)}</div>` : ''}</div>
      ${r.kind === 'lien' ? `<a class="btn sm" href="${esc(r.target)}" target="_blank" rel="noopener">Ouvrir ↗</a>` : `<span class="path">${esc(r.target)}</span><button class="btn sm ghost" data-act="copy" data-text="${esc(r.target)}">Copier le chemin</button>`}
      <button class="x" style="font-size:13px" data-act="res-edit" data-id="${r.id}">✎</button>
    </li>`).join('')}</ul></div>`).join('') : '<div class="empty">Ajoute tes dossiers de cours, manuels en ligne, liens de l\'ENT…</div>'}
  </div>`;
}

/* ============================== Réglages ============================== */
function vReglages() {
  const hasDemo = ['subjects', 'tasks', 'cards', 'qcm', 'exercises', 'resources'].some(k => S[k].some(x => x.demo));
  return `
  <div class="label">Paramètres</div><h1 style="font-size:46px;margin:8px 0 28px">Réglages</h1>
  <div class="grid g2">
    <div class="card">
      <div class="card-head"><h3>Profil & objectifs</h3></div>
      <form data-form="settings">
        ${fText('name', 'Prénom affiché', S.settings.name, 'required')}
        <div class="fields2">${fText('focusGoal', 'Objectif quotidien (min)', S.settings.focusGoal, 'type="number" min="10" step="10"')}${fText('weekGoal', 'Objectif hebdomadaire (min)', S.settings.weekGoal, 'type="number" min="30" step="30"')}</div>
        <button class="btn">Enregistrer</button>
      </form>
    </div>
    <div class="card">
      <div class="card-head"><h3>Synchronisation</h3><span class="pill" style="display:inline-flex;gap:6px;align-items:center;font-size:12px"><i class="dot ${sync}" style="width:7px;height:7px;border-radius:50%;display:inline-block"></i>${{ local: 'Mode local', ok: 'Synchronisé', pending: 'En cours', error: 'Erreur' }[sync]}</span></div>
      ${sb ? `<p class="small muted" style="margin-top:0">Connectée en tant que ${esc(user?.email)}. Les données sont enregistrées en ligne et disponibles sur tous les PC.</p>
        <div class="row"><button class="btn ghost sm" data-act="sync-now">Synchroniser maintenant</button><button class="btn ghost sm" data-act="logout">Se déconnecter</button></div>`
      : `<p class="small" style="margin-top:0">L'app fonctionne en <strong>mode local</strong> : les données sont enregistrées dans ce navigateur, sur ce PC uniquement. Pour les retrouver sur plusieurs PC, il faut configurer Supabase (voir le guide README).</p>`}
    </div>
    <div class="card">
      <div class="card-head"><h3>Sauvegarde</h3></div>
      <p class="small muted" style="margin-top:0">Exporte toutes tes données dans un fichier, à garder en lieu sûr ou pour les transférer.</p>
      <div class="row wrap"><button class="btn sm" data-act="export">Exporter (.json)</button><label class="btn sm ghost" style="cursor:pointer">Importer une sauvegarde<input type="file" accept=".json,application/json" data-change="import-file" hidden></label></div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Données</h3></div>
      ${hasDemo ? `<p class="small muted" style="margin-top:0">L'app contient des exemples (matières, cartes, QCM…) pour la découverte.</p><button class="btn sm" data-act="demo-clear">Supprimer les exemples</button>` : '<p class="small muted" style="margin-top:0">Aucune donnée d\'exemple.</p>'}
      <div style="margin-top:16px"><button class="link danger" data-act="reset-all">Tout effacer et repartir de zéro</button></div>
    </div>
  </div>
  <div class="card section">
    <div class="card-head"><h3>Consignes à utiliser avec Claude</h3></div>
    <div class="grid g3">
      <div><div class="label" style="margin-bottom:8px">Flashcards</div><div class="prompt-box">${esc(PROMPT_CARDS())}</div><button class="btn sm ghost" style="margin-top:8px" data-act="copy" data-text="${esc(PROMPT_CARDS())}">Copier</button></div>
      <div><div class="label" style="margin-bottom:8px">QCM</div><div class="prompt-box">${esc(PROMPT_QCM())}</div><button class="btn sm ghost" style="margin-top:8px" data-act="copy" data-text="${esc(PROMPT_QCM())}">Copier</button></div>
      <div><div class="label" style="margin-bottom:8px">Cas pratique</div><div class="prompt-box">${esc(PROMPT_CAS)}</div><button class="btn sm ghost" style="margin-top:8px" data-act="copy" data-text="${esc(PROMPT_CAS)}">Copier</button></div>
    </div>
  </div>`;
}

/* ============================== Actions ============================== */
const findTask = id => S.tasks.find(x => x.id === id);
const ACT = {
  copy: d => copy(d.text),
  'copy-prompt-cards': () => copy($('#prompt-cards').textContent),

  // tâches
  'task-add': d => modal('Nouvelle tâche', taskForm({ subjectId: d.sid || '' }), fd => { S.tasks.push({ id: uid(), title: fd.title.trim(), subjectId: fd.subjectId, due: fd.due, priority: fd.priority, done: false }); commit(); }),
  'task-edit': d => { const x = findTask(d.id); modal('Modifier la tâche', taskForm(x) + `<button type="button" class="link danger" id="del-task">Supprimer la tâche</button>`, fd => { Object.assign(x, { title: fd.title.trim(), subjectId: fd.subjectId, due: fd.due, priority: fd.priority }); commit(); });
    $('#del-task').onclick = () => { S.tasks = S.tasks.filter(y => y.id !== d.id); $('#modal').close(); commit(); }; },
  'task-toggle': d => { const x = findTask(d.id); x.done = !x.done; x.doneAt = x.done ? today() : null; commit(); },
  'tasks-all': () => { const open = S.tasks.filter(x => !x.done); modal(`Toutes les tâches (${open.length})`, `<ul class="list">${open.sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).map(taskRow).join('')}</ul>`, null); },

  // matières
  'subj-add': () => modal('Nouvelle matière', subjForm(), fd => {
    const s = { id: uid(), name: fd.name.trim(), exam: fd.exam, color: fd.color || PALETTE[S.subjects.length % PALETTE.length], parts: (fd.parts || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean).map(t => ({ id: uid(), title: t, level: 0 })), fiches: [] };
    S.subjects.push(s); commit({ render: false }); location.hash = `#/matieres/${s.id}`; render(); }),
  'subj-edit': d => { const s = subj(d.id); modal('Modifier la matière', subjForm(s) + `<button type="button" class="link danger" id="del-subj">Supprimer la matière</button>`, fd => { s.name = fd.name.trim(); s.exam = fd.exam; if (fd.color) s.color = fd.color; commit(); });
    $('#del-subj').onclick = () => { $('#modal').close(); confirmModal('Supprimer la matière ?', `« ${esc(s.name)} », son plan, ses fiches et ses ${cardsOf(s.id).length} cartes seront supprimés. Cette action est définitive.`, () => {
      S.subjects = S.subjects.filter(x => x.id !== s.id); S.cards = S.cards.filter(c => c.subjectId !== s.id); S.qcm = S.qcm.filter(c => c.subjectId !== s.id);
      commit({ render: false }); location.hash = '#/matieres'; render(); }); }; },
  'part-level': d => { const p = subj(d.sid).parts.find(x => x.id === d.id); p.level = Number(d.level); commit(); },
  'part-rename': d => { const p = subj(d.sid).parts.find(x => x.id === d.id); modal('Renommer la partie', fText('title', 'Titre', p.title, 'required'), fd => { p.title = fd.title.trim(); commit(); }); },
  'part-del': d => { const s = subj(d.sid); const p = s.parts.find(x => x.id === d.id); confirmModal('Supprimer la partie ?', `« ${esc(p.title)} » sera retirée du plan. Les cartes liées restent dans la matière.`, () => { s.parts = s.parts.filter(x => x.id !== d.id); S.cards.forEach(c => { if (c.partId === d.id) c.partId = ''; }); commit(); }); },
  'part-move': d => { const s = subj(d.sid); const i = s.parts.findIndex(x => x.id === d.id); const j = i + Number(d.dir); if (j < 0 || j >= s.parts.length) return; [s.parts[i], s.parts[j]] = [s.parts[j], s.parts[i]]; commit(); },
  'plan-paste': d => modal('Coller un plan', fArea('text', 'Une partie par ligne', '', 'rows="10" required'), fd => { const s = subj(d.sid); fd.text.split(/\r?\n/).map(x => x.trim()).filter(Boolean).forEach(t => s.parts.push({ id: uid(), title: t, level: 0 })); commit(); }, 'Ajouter'),
  'fiche-add': d => modal('Nouvelle fiche', ficheForm(), fd => { subj(d.sid).fiches.push({ id: uid(), title: fd.title.trim(), location: fd.location.trim(), note: fd.note.trim() }); commit(); }),
  'fiche-edit': d => { const s = subj(d.sid); const f = s.fiches.find(x => x.id === d.id); modal('Modifier la fiche', ficheForm(f) + `<button type="button" class="link danger" id="del-fiche">Supprimer la fiche</button>`, fd => { Object.assign(f, { title: fd.title.trim(), location: fd.location.trim(), note: fd.note.trim() }); commit(); });
    $('#del-fiche').onclick = () => { s.fiches = s.fiches.filter(x => x.id !== d.id); $('#modal').close(); commit(); }; },

  // révisions
  flip: () => { if (R) { R.flipped = true; render(); } },
  grade: d => grade(d.g),
  'review-restart': () => { R = null; render(); },
  'review-ahead': d => { const pool = S.cards.filter(c => !d.sid || c.subjectId === d.sid).sort((a, b) => a.box - b.box || a.due.localeCompare(b.due)).slice(0, 20); pool.forEach(c => c.due = today()); commit({ render: false }); R = null; render(); },
  'card-edit': d => { const c = S.cards.find(x => x.id === d.id); modal('Modifier la carte', `<div class="fields2">${fSel('subjectId', 'Matière', subjOptions(c.subjectId, null))}${fSel('partId', 'Partie', partOptions(c.subjectId, c.partId))}</div>${fArea('q', 'Question', c.q, 'required rows="3"')}${fArea('a', 'Réponse', c.a, 'required rows="5"')}`, fd => { Object.assign(c, { subjectId: fd.subjectId, partId: fd.partId, q: fd.q.trim(), a: fd.a.trim() }); commit(); }); },
  'card-del': d => { S.cards = S.cards.filter(x => x.id !== d.id); commit(); },

  // QCM
  'quiz-answer': d => { const x = S.qcm.find(y => y.id === Q.items[Q.idx]); Q.answered = Number(d.i); x.seen = (x.seen || 0) + 1; if (Q.answered === x.answer) { x.correct = (x.correct || 0) + 1; Q.score++; } else Q.wrong.push(x.id); commit(); },
  'quiz-next': () => { Q.idx++; Q.answered = null; render(); },
  'quiz-again': () => { Q = { ...Q, items: [...Q.items].sort(() => Math.random() - .5), idx: 0, score: 0, answered: null, wrong: [] }; render(); },

  // exercices
  'ex-add': d => modal(d.type === 'annale' ? 'Nouvelle annale' : 'Nouveau cas pratique', exForm({ type: d.type }), fd => { S.exercises.push({ id: uid(), type: d.type, status: 'todo', score: null, notes: '', draft: '', ...pickEx(fd) }); commit(); }),
  'ex-edit': d => { const e = S.exercises.find(x => x.id === d.id); modal('Modifier', exForm(e) + `<div class="fields2">${fText('score', 'Note /20', e.score ?? '', 'type="number" min="0" max="20" step="0.5"')}${fSel('status', 'Statut', `<option value="todo" ${e.status !== 'done' ? 'selected' : ''}>À faire</option><option value="done" ${e.status === 'done' ? 'selected' : ''}>Fait</option>`)}</div>${fArea('notes', 'Remarques', e.notes, 'rows="3"')}<button type="button" class="link danger" id="del-ex">Supprimer</button>`,
    fd => { Object.assign(e, pickEx(fd), { score: fd.score === '' ? null : Number(fd.score), status: fd.status, notes: fd.notes }); commit(); });
    $('#del-ex').onclick = () => { S.exercises = S.exercises.filter(x => x.id !== d.id); $('#modal').close(); commit(); }; },
  'ex-finish': d => { const e = S.exercises.find(x => x.id === d.id); const minutes = Math.round((Date.now() - (EX?.start || Date.now())) / 60000);
    modal('Exercice terminé', `<p class="serif" style="font-size:22px;margin-top:0">${fmtMin(minutes)} passées sur ce sujet.</p>${fText('score', 'Note /20 (auto-évaluation ou correction)', e.score ?? '', 'type="number" min="0" max="20" step="0.5"')}${fArea('notes', 'Ce que je dois retenir / retravailler', e.notes, 'rows="4"')}
      <label class="row small" style="gap:8px"><input type="checkbox" name="log" checked> Enregistrer ${fmtMin(minutes)} dans le temps de travail</label>`,
      fd => { e.status = 'done'; e.score = fd.score === '' ? null : Number(fd.score); e.notes = fd.notes; e.doneAt = today();
        if (fd.log && minutes >= 1) S.sessions.push({ id: uid(), date: today(), minutes, subjectId: e.subjectId, focus: 4, note: e.title });
        EX = null; commit({ render: false }); location.hash = `#/entrainement/${e.type === 'annale' ? 'annales' : 'cas'}`; render(); toast('Exercice enregistré'); }); },

  // concentration
  'session-edit': d => { const x = S.sessions.find(y => y.id === d.id); modal('Modifier la saisie', sessionFields(x), fd => { const v = readSession(fd); if (!v) return false; Object.assign(x, v); commit(); }); },
  'session-del': d => { S.sessions = S.sessions.filter(x => x.id !== d.id); commit(); },
  'goals-edit': () => modal('Objectifs de travail', `<div class="fields2">${fText('focusGoal', 'Par jour (minutes)', S.settings.focusGoal, 'type="number" min="10" step="10" required')}${fText('weekGoal', 'Par semaine (minutes)', S.settings.weekGoal, 'type="number" min="30" step="30" required')}</div><p class="hint">Repère : 4 h de travail effectif par jour = 240 minutes.</p>`,
    fd => { S.settings.focusGoal = Number(fd.focusGoal); S.settings.weekGoal = Number(fd.weekGoal); commit(); }),

  // habitudes
  'habit-toggle': d => { const l = S.habitLog[d.date] = S.habitLog[d.date] || []; const i = l.indexOf(d.id); if (i >= 0) l.splice(i, 1); else l.push(d.id); commit(); },
  'habit-add': () => modal('Nouvelle habitude', `${fText('name', 'Habitude', '', 'required placeholder="Ex. 10 min de méditation"')}${fSel('moment', 'Moment', MOMENTS.map(([k, l]) => `<option value="${k}">${l}</option>`).join(''))}`, fd => { S.habits.push({ id: uid(), name: fd.name.trim(), moment: fd.moment }); commit(); }),
  'habit-del': d => { const h = S.habits.find(x => x.id === d.id); confirmModal("Supprimer l'habitude ?", `« ${esc(h.name)} » et son historique seront supprimés.`, () => { S.habits = S.habits.filter(x => x.id !== d.id); Object.values(S.habitLog).forEach(l => { const i = l.indexOf(d.id); if (i >= 0) l.splice(i, 1); }); commit(); }); },

  // ressources
  'res-add': () => modal('Nouvelle ressource', resForm(), fd => { S.resources.push({ id: uid(), ...pickRes(fd) }); commit(); }),
  'res-edit': d => { const r = S.resources.find(x => x.id === d.id); modal('Modifier la ressource', resForm(r) + `<button type="button" class="link danger" id="del-res">Supprimer</button>`, fd => { Object.assign(r, pickRes(fd)); commit(); });
    $('#del-res').onclick = () => { S.resources = S.resources.filter(x => x.id !== d.id); $('#modal').close(); commit(); }; },

  // réglages
  export: () => { const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `revisions-sauvegarde-${today()}.json`; a.click(); URL.revokeObjectURL(a.href); },
  'demo-clear': () => confirmModal('Supprimer les exemples ?', 'Les cartes, QCM, tâches, exercices et ressources d\'exemple seront supprimés. Les matières d\'exemple que tu as modifiées ou enrichies sont conservées.', () => {
    ['tasks', 'cards', 'qcm', 'exercises', 'resources'].forEach(k => S[k] = S[k].filter(x => !x.demo));
    S.subjects = S.subjects.filter(s => {
      if (!s.demo) return true;
      const used = s.fiches.length || S.cards.some(c => c.subjectId === s.id) || S.qcm.some(c => c.subjectId === s.id) || S.tasks.some(c => c.subjectId === s.id) || S.exercises.some(c => c.subjectId === s.id) || S.sessions.some(c => c.subjectId === s.id);
      if (used) { delete s.demo; return true; } return false;
    });
    commit(); toast('Exemples supprimés'); }),
  'reset-all': () => confirmModal('Tout effacer ?', 'Toutes les matières, cartes, sessions et habitudes seront supprimées définitivement. Pense à exporter une sauvegarde avant.', () => {
    const name = S.settings.name; S = normalize({ subjects: [], tasks: [], cards: [], qcm: [], exercises: [], sessions: [], habitLog: {}, resources: [], habits: seed().habits, settings: { ...S.settings, name } }); commit(); toast('Données effacées'); }, 'Tout effacer'),
  'sync-now': async () => { await pushRemote(); toast(sync === 'ok' ? 'Synchronisé' : 'Échec de la synchronisation'); render(); },
  logout: async () => { await sb.auth.signOut(); localStorage.removeItem(LS_KEY); location.hash = ''; location.reload(); },
};

function ficheForm(f = {}) {
  return `${fText('title', 'Titre de la fiche', f.title, 'required placeholder="Ex. Fiche — Les actes administratifs unilatéraux"')}
  ${fText('location', 'Où la trouver', f.location, 'placeholder="Chemin du fichier, dossier, ou lien https://…"')}
  <p class="hint">Ex. « Documents\\Droit L3\\Administratif\\Fiche AAU.docx » ou un lien Google Drive.</p>
  ${fText('note', 'Note', f.note, 'placeholder="Facultatif"')}`;
}
function exForm(e = {}) {
  return `${fText('title', 'Intitulé', e.title, 'required')}
  <div class="fields2">${fSel('subjectId', 'Matière', subjOptions(e.subjectId, null))}${e.type === 'annale' ? fText('year', 'Année / session', e.year, 'placeholder="Ex. 2024 — session 1"') : fText('year', 'Thème', e.year, 'placeholder="Facultatif"')}</div>
  ${fText('location', 'Emplacement du sujet (facultatif)', e.location, 'placeholder="Chemin ou lien"')}
  ${fArea('enonce', 'Énoncé (facultatif — tu peux le coller ici)', e.enonce, 'rows="6"')}`;
}
const pickEx = fd => ({ title: fd.title.trim(), subjectId: fd.subjectId, year: fd.year || '', location: (fd.location || '').trim(), enonce: fd.enonce || '' });
function resForm(r = {}) {
  return `${fText('title', 'Titre', r.title, 'required')}
  <div class="fields2">${fSel('kind', 'Type', [['lien', 'Lien web'], ['fichier', 'Fichier sur le PC'], ['dossier', 'Dossier sur le PC']].map(([k, l]) => `<option value="${k}" ${k === (r.kind || 'lien') ? 'selected' : ''}>${l}</option>`).join(''))}${fSel('subjectId', 'Matière', subjOptions(r.subjectId, 'Général'))}</div>
  ${fText('target', 'Adresse ou chemin', r.target, 'required placeholder="https://… ou C:\\Users\\…\\Droit L3"')}
  ${fText('note', 'Note', r.note, 'placeholder="Facultatif"')}`;
}
const pickRes = fd => {
  let target = fd.target.trim();
  if (fd.kind === 'lien' && !/^https?:\/\//i.test(target)) target = 'https://' + target;
  return { title: fd.title.trim(), kind: fd.kind, subjectId: fd.subjectId, target, note: fd.note.trim() };
};

/* Formulaires inline */
const FORMS = {
  'part-add': (fd, f) => { subj(f.dataset.sid).parts.push({ id: uid(), title: fd.title.trim(), level: 0 }); commit(); setTimeout(() => { const i = $('[data-form="part-add"] input'); if (i) i.focus(); }, 0); },
  'cards-import': fd => {
    const items = parseCards(fd.text);
    if (!items.length) { toast('Aucune carte reconnue — vérifie le format « question :: réponse »'); return; }
    items.forEach(o => S.cards.push({ id: uid(), subjectId: fd.subjectId, partId: fd.partId, q: o.q, a: o.a, box: 0, due: today(), reviews: 0, lapses: 0, created: today() }));
    commit({ render: false }); toast(`${items.length} carte${items.length > 1 ? 's' : ''} importée${items.length > 1 ? 's' : ''}`); location.hash = `#/revisions/cartes/${fd.subjectId}`; render();
  },
  'card-add': (fd, f) => { S.cards.push({ id: uid(), subjectId: fd.subjectId, partId: fd.partId, q: fd.q.trim(), a: fd.a.trim(), box: 0, due: today(), reviews: 0, lapses: 0, created: today() }); commit({ render: false }); toast('Carte ajoutée'); f.elements.q.value = ''; f.elements.a.value = ''; f.elements.q.focus(); },
  'qcm-import': fd => {
    let items; try { items = parseQcm(fd.text); } catch (e) { toast('JSON illisible — recopie toute la réponse de Claude'); return; }
    if (!items.length) { toast('Aucune question reconnue'); return; }
    items.forEach(o => S.qcm.push({ id: uid(), subjectId: fd.subjectId, ...o, seen: 0, correct: 0 }));
    commit(); toast(`${items.length} question${items.length > 1 ? 's' : ''} importée${items.length > 1 ? 's' : ''}`);
  },
  'quiz-start': fd => {
    let pool = S.qcm.filter(x => !fd.subjectId || x.subjectId === fd.subjectId);
    if (!pool.length) { toast('Aucune question pour cette matière — importe des QCM'); return; }
    pool = pool.map(x => ({ x, r: Math.random(), w: x.seen ? x.correct / x.seen : -1 }));
    pool.sort(fd.mode === 'weak' ? (a, b) => a.w - b.w || a.r - b.r : (a, b) => a.r - b.r);
    Q = { items: pool.slice(0, Number(fd.n)).map(o => o.x.id).sort(() => Math.random() - .5), idx: 0, score: 0, answered: null, wrong: [] };
    location.hash = '#/entrainement/qcm/session';
  },
  'session-add': (fd, f) => { const v = readSession(fd); if (!v) return; addSession(v); toast(`${fmtMin(v.minutes)} enregistrées`); },
  'legal-search': fd => { const src = LEGAL.find(l => l.k === fd.src); window.open(src.search(fd.q.trim()), '_blank', 'noopener'); },
  settings: fd => { S.settings.name = fd.name.trim(); S.settings.focusGoal = Number(fd.focusGoal) || 240; S.settings.weekGoal = Number(fd.weekGoal) || 1200; commit(); toast('Réglages enregistrés'); },
};

const CHANGES = {
  'cards-subject': el => { const sel = el.form.querySelector('[name=partId]'); if (sel) sel.innerHTML = partOptions(el.value); const pb = $('#prompt-cards'); if (pb) pb.textContent = PROMPT_CARDS(subjName(el.value)); },
  'cardlist-subject': el => { location.hash = `#/revisions/cartes/${el.value}`; },
  'import-file': el => {
    const file = el.files[0]; if (!file) return;
    file.text().then(txt => { const data = JSON.parse(txt); if (!data.subjects) throw new Error();
      confirmModal('Importer cette sauvegarde ?', 'Les données actuelles seront remplacées par celles du fichier.', () => { S = normalize(data); commit(); toast('Sauvegarde importée'); }, 'Importer');
    }).catch(() => toast('Fichier de sauvegarde invalide'));
  },
};
const INPUTS = {
  'cardlist-q': el => { vCardList.q = el.value; const pos = el.selectionStart; render(); const n = $('[data-input="cardlist-q"]'); n.focus(); n.setSelectionRange(pos, pos); },
  'ex-draft': el => { const e = S.exercises.find(x => x.id === el.dataset.id); e.draft = el.value; clearTimeout(INPUTS._t); INPUTS._t = setTimeout(() => commit({ render: false }), 800); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  e.preventDefault(); fn({ ...el.dataset }, el, e);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault(); const fn = FORMS[f.dataset.form];
  if (fn) fn(Object.fromEntries(new FormData(f)), f);
});
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && CHANGES[el.dataset.change]) CHANGES[el.dataset.change](el); });
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && INPUTS[el.dataset.input]) INPUTS[el.dataset.input](el); });
document.addEventListener('keydown', e => {
  if ($('#modal').open || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
  const r = route();
  if (r[0] === 'revisions' && r[1] === 'session' && R && R.idx < R.queue.length) {
    if (!R.flipped && (e.code === 'Space' || e.key === 'Enter')) { e.preventDefault(); ACT.flip(); }
    else if (R.flipped && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); grade(['again', 'hard', 'good', 'easy'][Number(e.key) - 1]); }
  }
  if (r[0] === 'entrainement' && r[2] === 'session' && Q && Q.idx < Q.items.length) {
    if (Q.answered === null && /^[1-6a-dA-D]$/.test(e.key)) { const i = /\d/.test(e.key) ? Number(e.key) - 1 : 'abcd'.indexOf(e.key.toLowerCase()); const btn = document.querySelector(`[data-act="quiz-answer"][data-i="${i}"]`); if (btn) btn.click(); }
    else if (Q.answered !== null && (e.key === 'Enter' || e.code === 'Space')) { e.preventDefault(); ACT['quiz-next'](); }
  }
});

boot().catch(err => { console.error(err); $('#app').innerHTML = `<div class="boot">Erreur de chargement : ${esc(err.message)}</div>`; });
})();
