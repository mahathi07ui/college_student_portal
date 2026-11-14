/* College Student Portal – data is saved in the browser (localStorage). */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

let users = load('portal_users', []);
let me = null;

/* ---------- demo data given to every new student ---------- */
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
function seed() {
  const c = (code, name, credits, att, tot, marks) => ({ code, name, credits, att, tot, marks });
  const d = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  return {
    courses: [
      c('CS101','Programming Fundamentals',4,18,20,86),
      c('MA102','Engineering Mathematics',4,15,20,72),
      c('PH103','Physics',3,17,20,64),
      c('EN104','Communication Skills',2,19,20,91),
      c('CS105','Web Technologies',3,14,20,78)
    ],
    timetable: {
      Monday:['CS101','MA102','PH103','',''],
      Tuesday:['CS105','EN104','CS101','',''],
      Wednesday:['MA102','PH103','','CS105',''],
      Thursday:['EN104','CS101','MA102','PH103',''],
      Friday:['CS105','CS101','','EN104','']
    },
    assignments: [
      { id:1, course:'CS101', title:'Build a calculator in JavaScript', due:d(3), done:false },
      { id:2, course:'MA102', title:'Problem set 4: matrices', due:d(6), done:false },
      { id:3, course:'PH103', title:'Lab report: pendulum', due:d(-2), done:true },
      { id:4, course:'CS105', title:'Responsive landing page', due:d(10), done:false }
    ],
    fees: [
      { id:1, item:'Tuition – Semester 1', amount:45000, due:d(-30), paid:true },
      { id:2, item:'Library & Lab', amount:5000, due:d(12), paid:false },
      { id:3, item:'Exam fee', amount:2500, due:d(25), paid:false }
    ]
  };
}
const ANNOUNCEMENTS = [
  { title:'Mid-semester exams begin next month', date:'Nov 10, 2026', body:'The exam schedule is published on the notice board. Hall tickets will be issued one week before.' },
  { title:'Library hours extended', date:'Nov 8, 2026', body:'The library will stay open until 9 PM on weekdays during exam season.' },
  { title:'Annual tech fest registrations open', date:'Nov 5, 2026', body:'Register your team with the student council by the end of the month.' },
  { title:'Holiday on Nov 20', date:'Nov 2, 2026', body:'The college will remain closed. Classes resume on the next working day.' }
];

/* ---------- helpers ---------- */
const pct = (a, t) => t ? Math.round(a / t * 100) : 0;
const grade = m => m >= 90 ? ['A+',10] : m >= 80 ? ['A',9] : m >= 70 ? ['B',8] : m >= 60 ? ['C',7] : m >= 50 ? ['D',6] : ['F',0];
const money = n => '₹' + n.toLocaleString('en-IN');
const fmt = s => new Date(s + 'T00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
const cname = code => (me.courses.find(c => c.code === code) || {}).name || code;
const gpa = () => {
  const cr = me.courses.reduce((s, c) => s + c.credits, 0);
  return (me.courses.reduce((s, c) => s + grade(c.marks)[1] * c.credits, 0) / cr).toFixed(2);
};
const attAvg = () => pct(me.courses.reduce((s, c) => s + c.att, 0), me.courses.reduce((s, c) => s + c.tot, 0));
const persist = () => save('portal_users', users);

/* ---------- auth ---------- */
function showAuth(which) {
  $('#login-form').classList.toggle('hidden', which !== 'login');
  $('#register-form').classList.toggle('hidden', which !== 'register');
  $('#tab-login').classList.toggle('active', which === 'login');
  $('#tab-register').classList.toggle('active', which === 'register');
  $('#auth-msg').textContent = '';
}
$('#tab-login').onclick = () => showAuth('login');
$('#tab-register').onclick = () => showAuth('register');

$('#register-form').onsubmit = e => {
  e.preventDefault();
  const email = $('#r-email').value.trim().toLowerCase();
  if (users.some(u => u.email === email)) { $('#auth-msg').textContent = 'That email is already registered. Log in instead.'; return; }
  const n = users.length + 1;
  users.push({
    email, password: $('#r-pass').value, name: $('#r-name').value.trim(),
    course: $('#r-course').value, roll: 'STU' + String(2026000 + n),
    phone: '', address: '', dob: '', ...seed()
  });
  persist();
  login(email);
};
$('#login-form').onsubmit = e => {
  e.preventDefault();
  const email = $('#l-email').value.trim().toLowerCase();
  const u = users.find(x => x.email === email && x.password === $('#l-pass').value);
  if (!u) { $('#auth-msg').textContent = 'Email or password is incorrect.'; return; }
  login(email);
};
function login(email) {
  save('portal_session', email);
  me = users.find(u => u.email === email);
  $('#auth').classList.add('hidden');
  $('#app').classList.remove('hidden');
  buildNav();
  route();
}
$('#logout').onclick = () => {
  localStorage.removeItem('portal_session');
  me = null;
  $('#app').classList.add('hidden');
  $('#auth').classList.remove('hidden');
  ['#login-form', '#register-form'].forEach(f => $(f).reset());
  showAuth('login');
  location.hash = '';
};

/* ---------- pages ---------- */
const pages = {
  dashboard() {
    const pending = me.assignments.filter(a => !a.done);
    const due = me.fees.filter(f => !f.paid).reduce((s, f) => s + f.amount, 0);
    return `<h1>Welcome, ${esc(me.name.split(' ')[0])}</h1><p class="sub">${esc(me.course)} · ${esc(me.roll)}</p>
    <div class="grid">
      <div class="card s1"><div class="muted">Attendance</div><div class="stat">${attAvg()}%</div></div>
      <div class="card s2"><div class="muted">GPA</div><div class="stat">${gpa()}</div></div>
      <div class="card s3"><div class="muted">Pending assignments</div><div class="stat">${pending.length}</div></div>
      <div class="card s4"><div class="muted">Fees due</div><div class="stat">${money(due)}</div></div>
    </div>
    <h3>Next deadlines</h3>
    <div class="table-wrap"><table>${pending.length ? pending.sort((a,b)=>a.due.localeCompare(b.due)).slice(0,3).map(a =>
      `<tr><td>${esc(a.title)}</td><td class="muted">${esc(a.course)}</td><td>${fmt(a.due)}</td></tr>`).join('')
      : '<tr><td class="muted">Nothing pending. You are all caught up.</td></tr>'}</table></div>
    <h3>Latest announcement</h3>
    <div class="card"><strong>${ANNOUNCEMENTS[0].title}</strong><div class="muted">${ANNOUNCEMENTS[0].date}</div></div>`;
  },

  profile() {
    const f = (id, label, val, type = 'text', cls = '') =>
      `<label class="${cls}">${label}<input id="p-${id}" type="${type}" value="${esc(val)}"></label>`;
    return `<h1>Profile</h1><p class="sub">Keep your details up to date.</p>
    <form id="profile-form" class="profile card">
      ${f('name','Full name',me.name)}
      ${f('roll','Roll number',me.roll,'text','ro')}
      ${f('email','Email',me.email,'email','ro')}
      ${f('course','Course',me.course,'text','ro')}
      ${f('phone','Phone',me.phone,'tel')}
      ${f('dob','Date of birth',me.dob,'date')}
      ${f('address','Address',me.address,'text','full')}
      <div class="full"><button class="primary">Save changes</button><span id="saved" class="toast"></span></div>
    </form>`;
  },

  attendance() {
    return `<h1>Attendance</h1><p class="sub">Mark today's classes. Below 75% is flagged.</p>
    <div class="table-wrap"><table>
      <tr><th>Course</th><th>Attended</th><th>Percentage</th><th></th><th>Mark today</th></tr>
      ${me.courses.map((c, i) => { const p = pct(c.att, c.tot); return `<tr>
        <td>${esc(c.name)}<div class="muted">${c.code}</div></td>
        <td>${c.att} / ${c.tot}</td>
        <td class="${p < 75 ? 'bad' : 'ok'}">${p}%</td>
        <td><div class="bar"><i style="width:${p}%"></i></div></td>
        <td class="row"><button class="btn" data-att="${i}" data-v="1">Present</button><button class="btn" data-att="${i}" data-v="0">Absent</button></td></tr>`; }).join('')}
    </table></div>`;
  },

  timetable() {
    return `<h1>Timetable</h1><p class="sub">Weekly class schedule.</p>
    <div class="table-wrap"><table>
      <tr><th>Day</th><th>9:00</th><th>10:00</th><th>11:00</th><th>1:00</th><th>2:00</th></tr>
      ${DAYS.map(d => `<tr><td><strong>${d}</strong></td>${me.timetable[d].map(c => `<td>${c ? `${c}<div class="muted">${esc(cname(c))}</div>` : '<span class="muted">–</span>'}</td>`).join('')}</tr>`).join('')}
    </table></div>`;
  },

  results() {
    return `<h1>Results & Grades</h1><p class="sub">Semester GPA: <strong>${gpa()}</strong> (10-point scale)</p>
    <div class="table-wrap"><table>
      <tr><th>Course</th><th>Credits</th><th>Marks</th><th>Grade</th></tr>
      ${me.courses.map(c => { const g = grade(c.marks); return `<tr><td>${esc(c.name)}</td><td>${c.credits}</td><td>${c.marks}/100</td><td class="${g[0]==='F'?'bad':''}"><strong>${g[0]}</strong></td></tr>`; }).join('')}
    </table></div>`;
  },

  assignments() {
    const today = new Date().toISOString().slice(0, 10);
    return `<h1>Assignments</h1><p class="sub">Mark work as submitted when you finish.</p>
    <div class="table-wrap"><table>
      <tr><th>Title</th><th>Course</th><th>Due</th><th>Status</th><th></th></tr>
      ${me.assignments.map(a => {
        const late = !a.done && a.due < today;
        return `<tr><td>${esc(a.title)}</td><td>${a.course}</td><td>${fmt(a.due)}</td>
        <td class="${a.done ? 'ok' : late ? 'bad' : 'warn'}">${a.done ? 'Submitted' : late ? 'Overdue' : 'Pending'}</td>
        <td><button class="btn" data-asg="${a.id}">${a.done ? 'Undo' : 'Mark submitted'}</button></td></tr>`; }).join('')}
    </table></div>`;
  },

  announcements() {
    return `<h1>Announcements</h1><p class="sub">News from the college.</p><div class="list">
    ${ANNOUNCEMENTS.map(a => `<div class="card"><h3>${a.title}</h3><div class="muted">${a.date}</div><p>${a.body}</p></div>`).join('')}</div>`;
  },

  fees() {
    const paid = me.fees.filter(f => f.paid).reduce((s, f) => s + f.amount, 0);
    const due = me.fees.filter(f => !f.paid).reduce((s, f) => s + f.amount, 0);
    return `<h1>Fee Details</h1><p class="sub">Paid ${money(paid)} · Outstanding ${money(due)}</p>
    <div class="table-wrap"><table>
      <tr><th>Item</th><th>Amount</th><th>Due date</th><th>Status</th><th></th></tr>
      ${me.fees.map(f => `<tr><td>${f.item}</td><td>${money(f.amount)}</td><td>${fmt(f.due)}</td>
        <td class="${f.paid ? 'ok' : 'warn'}">${f.paid ? 'Paid' : 'Due'}</td>
        <td>${f.paid ? '' : `<button class="btn" data-fee="${f.id}">Pay now</button>`}</td></tr>`).join('')}
    </table></div><p class="muted">Demo only: no real payment is processed.</p>`;
  }
};

/* ---------- navigation ---------- */
const TITLES = { dashboard:'Dashboard', profile:'Profile', attendance:'Attendance', timetable:'Timetable', results:'Results', assignments:'Assignments', announcements:'Announcements', fees:'Fees' };
function buildNav() {
  $('#nav').innerHTML = Object.entries(TITLES).map(([k, v]) => `<a href="#${k}" data-p="${k}">${v}</a>`).join('');
}
function route() {
  if (!me) return;
  const p = pages[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard';
  $('#view').innerHTML = pages[p]();
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.p === p));
  document.querySelectorAll('.ro input').forEach(i => i.readOnly = true);
  const pf = $('#profile-form');
  if (pf) pf.onsubmit = e => {
    e.preventDefault();
    Object.assign(me, { name: $('#p-name').value.trim() || me.name, phone: $('#p-phone').value, dob: $('#p-dob').value, address: $('#p-address').value });
    persist();
    $('#saved').textContent = 'Saved';
  };
}
window.addEventListener('hashchange', route);

/* button actions (attendance, assignments, fees) */
$('#view').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.att !== undefined) {
    const c = me.courses[b.dataset.att]; c.tot++; if (b.dataset.v === '1') c.att++;
  } else if (b.dataset.asg) {
    const a = me.assignments.find(x => x.id == b.dataset.asg); a.done = !a.done;
  } else if (b.dataset.fee) {
    if (!confirm('Pay this fee now? (demo)')) return;
    me.fees.find(x => x.id == b.dataset.fee).paid = true;
  } else return;
  persist(); route();
});

/* ---------- start ---------- */
const s = load('portal_session', null);
if (s && users.some(u => u.email === s)) login(s);
else $('#auth').classList.remove('hidden');
