export const PATTERNS: Record<string, RegExp> = {
  aadhaar:      /\b[2-9]{1}[0-9]{11}\b/g,
  pan:          /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
  ifsc:         /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
  phone_IN:     /(\+91[\-\s]?)?[6-9]\d{9}\b/g,
  email:        /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
  bank_account: /\b\d{9,18}\b/g,
  passport_IN:  /\b[A-Z]{1}[0-9]{7}\b/g,
  dob:          /\b(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-](19|20)\d{2}\b/g,
  credit_card:  /\b(?:\d[ \-]?){13,16}\b/g,
};

export const SENSITIVE_KEYS = [
  'password', 'passwd', 'secret', 'token', 'api_key', 'apikey',
  'private_key', 'privatekey', 'ssn', 'dob', 'salary', 'medical',
  'diagnosis', 'prescription', 'aadhaar', 'pan', 'bank_account',
  'account_number', 'credit_card', 'cvv', 'otp',
];
