const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com',
  'mailinator.com',
  'dispostable.com',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) => {
  if (typeof email !== 'string') {
    return '';
  }

  return email.trim().toLowerCase();
};

const isValidEmail = (email) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    return false;
  }

  const domain = normalizedEmail.split('@')[1];
  if (!domain) {
    return false;
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return false;
  }

  return true;
};

const validatePassword = (password) => {
  if (typeof password !== 'string') {
    return false;
  }

  const trimmedPassword = password.trim();
  if (trimmedPassword.length < 8) {
    return false;
  }

  return true;
};

module.exports = {
  DISPOSABLE_EMAIL_DOMAINS,
  EMAIL_REGEX,
  normalizeEmail,
  isValidEmail,
  validatePassword,
};
