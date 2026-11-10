// Application records remain local until individual Laravel modules exist.
// Storage is injected so persistence failures and permissions can be tested without a browser.
export const DATABASE_KEY = 'internms_mock_database';
export const copy = value => JSON.parse(JSON.stringify(value));

export function createLocalRepository(seed, storage) {
  return {
    read() {
      const raw = storage.getItem(DATABASE_KEY);
      if (!raw) return copy(seed);
      let data;
      try { data = JSON.parse(raw); } catch { throw new Error('Local data is unreadable. Export or recover your browser session data before resetting it.'); }
      if (!Array.isArray(data.users)) throw new Error('Local data has an invalid users collection.');
      return data;
    },
    write(data) {
      try { storage.setItem(DATABASE_KEY, JSON.stringify(data)); }
      catch { throw new Error('Local changes could not be saved. Browser storage may be full or disabled. Your changes have not been committed.'); }
      return copy(data);
    },
    transact(action) {
      const next = this.read();
      action(next);
      return this.write(next);
    }
  };
}

export function scopedStudents(db, user, college = 'ALL') {
  return db.users.filter(student => student.role === 'student' && (
    user.role === 'student' ? student.id === user.id :
    user.role === 'coordinator' ? student.college === user.college :
    user.role === 'supervisor' ? Boolean(user.company) && student.company === user.company :
    user.role === 'admin' && (college === 'ALL' || student.college === college)
  ));
}

export function contactsFor(db, user) {
  const students = new Set(scopedStudents(db, user).map(student => student.id));
  return db.users.filter(contact => contact.id !== user.id && (
    user.role === 'admin' ||
    (user.role === 'student' && (contact.role === 'admin' || (contact.role === 'coordinator' && contact.college === user.college) || (contact.role === 'supervisor' && Boolean(user.company) && contact.company === user.company))) ||
    (user.role === 'coordinator' && (students.has(contact.id) || ['supervisor', 'admin'].includes(contact.role))) ||
    (user.role === 'supervisor' && (students.has(contact.id) || ['coordinator', 'admin'].includes(contact.role)))
  ));
}

export function requireStudent(db, actor) {
  const student = db.users.find(user => user.id === actor.id && user.role === 'student');
  if (actor.role !== 'student' || !student) throw new Error('This operation is available only for your own student profile.');
  student.portfolioData ||= { skills: [], coursework: [], achievements: [] };
  return student;
}

export function updateProfile(db, actor, values) {
  const student = requireStudent(db, actor);
  const gpa = Number(values.gpa);
  if (!Number.isFinite(gpa) || gpa < 1 || gpa > 5) throw new Error('GPA must be between 1.00 and 5.00.');
  if (!["Dean's Lister", 'Regular Standing', 'Probationary'].includes(values.academicStanding)) throw new Error('Choose an academic standing.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || !values.phone?.trim() || !values.bio?.trim()) throw new Error('Enter a valid email, phone number, and career summary.');
  if (values.portfolioUrl) {
    let url;
    try { url = new URL(values.portfolioUrl); } catch { throw new Error('Enter a valid portfolio URL.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Portfolio links must use HTTP or HTTPS.');
  }
  student.gpa = gpa;
  student.academicStanding = values.academicStanding;
  for (const key of ['email', 'phone', 'portfolioUrl', 'bio']) student.portfolioData[key] = (values[key] || '').trim();
}

export function changePortfolio(db, actor, collection, action, value) {
  const student = requireStudent(db, actor);
  if (!['skills', 'coursework', 'achievements'].includes(collection)) throw new Error('Unknown portfolio collection.');
  const items = student.portfolioData[collection] ||= [];
  if (action === 'add') {
    if (collection === 'achievements') {
      if (!value.title?.trim() || !value.issuer?.trim() || !value.description?.trim()) throw new Error('Complete the achievement title, organization, and description.');
      items.push({ id: crypto.randomUUID(), title: value.title.trim(), issuer: value.issuer.trim(), description: value.description.trim(), date: '2026' });
    } else {
      if (!String(value).trim()) throw new Error('Enter a value before adding it.');
      if (items.some(item => item.trim().toLowerCase() === String(value).trim().toLowerCase())) throw new Error('This entry is already in your profile.');
      items.push(String(value).trim());
    }
  } else if (action === 'remove') {
    if (!Number.isInteger(value) || value < 0 || value >= items.length) throw new Error('That item no longer exists.');
    items.splice(value, 1);
  } else throw new Error('Unknown portfolio action.');
}

export function sendMessage(db, actor, recipientId, text) {
  if (!contactsFor(db, actor).some(contact => contact.id === recipientId)) throw new Error('This recipient is outside your permitted contacts.');
  if (!text?.trim()) throw new Error('Enter a message.');
  (db.messages ||= []).push({ id: crypto.randomUUID(), senderId: actor.id, senderName: actor.name, recipientId, text: text.trim(), time: new Date().toLocaleString(), timestamp: new Date().toISOString() });
}