export function scopedStudents(db = {}, user = {}, college = 'ALL') {
  return (db.users || []).filter(student => student.role === 'student' && (
    user.role === 'student' ? student.id === user.id :
    user.role === 'coordinator' ? student.college === user.college :
    user.role === 'supervisor' ? Boolean(user.company) && student.company === user.company :
    user.role === 'admin' && (college === 'ALL' || student.college === college)
  ));
}

export function contactsFor(db = {}, user = {}) {
  const students = new Set(scopedStudents(db, user).map(student => student.id));
  return (db.users || []).filter(contact => contact.id !== user.id && (
    user.role === 'admin' ||
    (user.role === 'student' && (contact.role === 'admin' || (contact.role === 'coordinator' && contact.college === user.college) || (contact.role === 'supervisor' && Boolean(user.company) && contact.company === user.company))) ||
    (user.role === 'coordinator' && (students.has(contact.id) || ['supervisor', 'admin'].includes(contact.role))) ||
    (user.role === 'supervisor' && (students.has(contact.id) || ['coordinator', 'admin'].includes(contact.role)))
  ));
}
