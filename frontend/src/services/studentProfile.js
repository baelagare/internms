// Presentation validation mirrors the existing local profile contract.
export const academicStandings = ["Dean's Lister", 'Regular Standing', 'Probationary'];

export function profileValues(user) {
  const portfolio = user.portfolioData || {};
  return { gpa: String(user.gpa ?? ''), academicStanding: user.academicStanding || '', email: portfolio.email ?? user.email ?? '', phone: portfolio.phone || '', portfolioUrl: portfolio.portfolioUrl || '', bio: portfolio.bio || '' };
}

export function refreshedProfileValues(values, saved, user) {
  const keys = Object.keys(values);
  const isPristine = keys.every(key => values[key] === saved[key]);
  if (!isPristine) return null;

  const refreshed = profileValues(user);
  return keys.every(key => values[key] === refreshed[key]) ? null : refreshed;
}

export function validateProfile(values) {
  const errors = {};
  if (!String(values.gpa).trim() || !Number.isFinite(Number(values.gpa)) || Number(values.gpa) < 1 || Number(values.gpa) > 5) errors.gpa = 'Enter a GPA between 1.00 and 5.00.';
  else if (Math.abs(Number(values.gpa) * 100 - Math.round(Number(values.gpa) * 100)) > 1e-8) errors.gpa = 'Use no more than two decimal places.';
  if (!values.phone.trim()) errors.phone = 'Enter your mobile number.';
  if (!values.bio.trim()) errors.bio = 'Enter a brief career summary.';
  return errors;
}

export function validatePortfolioEntry(items, value) {
  if (!value.trim()) return 'Enter a value before adding it.';
  if (items.some(item => item.trim().toLowerCase() === value.trim().toLowerCase())) return 'This entry is already in your profile.';
  return '';
}

export function formatProfileDate(value) {
  if (!value) return '';
  // Keep partial legacy dates intact; never manufacture a month or day.
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}