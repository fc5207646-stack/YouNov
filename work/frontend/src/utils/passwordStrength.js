
export const calculatePasswordStrength = (password) => {
  let score = 0;
  if (!password) return { score: 0, label: 'Weak', color: 'bg-slate-700' };

  if (password.length > 7) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score === 3) return { score: 2, label: 'Fair', color: 'bg-yellow-500' };
  if (score === 4) return { score: 3, label: 'Good', color: 'bg-blue-500' };
  return { score: 4, label: 'Strong', color: 'bg-green-500' };
};
