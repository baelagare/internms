// Presentation validation mirrors the existing local profile contract.
export const academicStandings = ["Dean's Lister", 'Regular Standing', 'Probationary'];

export function profileValues(user) {
  const portfolio = user.portfolioData || {};
  return { gpa: String(user.gpa ?? ''), academicStanding: user.academicStanding || '', email: portfolio.email ?? user.email ?? '', phone: portfolio.phone || '', portfolioUrl: portfolio.portfolioUrl || '', bio: portfolio.bio || '' };
}

export function validateProfile(values) {
  const errors = {};
  if (!String(values.gpa).trim() || !Number.isFinite(Number(values.gpa)) || Number(values.gpa) < 1 || Number(values.gpa) > 5) errors.gpa = 'Enter a GPA between 1.00 and 5.00.';
  else if (Math.abs(Number(values.gpa) * 100 - Math.round(Number(values.gpa) * 100)) > 1e-8) errors.gpa = 'Use no more than two decimal places.';
  if (!academicStandings.includes(values.academicStanding)) errors.academicStanding = 'Choose your academic standing.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.';
  if (!values.phone.trim()) errors.phone = 'Enter your mobile number.';
  if (!values.bio.trim()) errors.bio = 'Enter a brief career summary.';
  if (values.portfolioUrl) {
    try { if (!['http:', 'https:'].includes(new URL(values.portfolioUrl).protocol)) throw new Error(); }
    catch { errors.portfolioUrl = 'Enter a complete HTTP or HTTPS URL.'; }
  }
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