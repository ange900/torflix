export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  score = Math.min(4, score);
  const labels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  return { score, label: labels[score] };
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
