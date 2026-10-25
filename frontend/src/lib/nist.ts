// A pragmatic subset of NIST SP 800-63B §5.1.1 memorized-secret rules, checkable client-side.
const COMMON = new Set(['password', '123456', '123456789', 'qwerty', '12345678', '111111', '1234567890',
  'abc123', 'password1', 'iloveyou', 'admin', 'welcome', 'monkey', 'dragon', 'letmein', 'football', 'sunshine'])

export function nistChecks(pw: string) {
  const lower = pw.toLowerCase()
  const repeated = /(.)\1{2,}/.test(pw)
  const sequential = /(012|123|234|345|456|567|678|789|abc|bcd|cde|def)/.test(lower)
  return [
    { id: 'len8', label: 'At least 8 characters', pass: pw.length >= 8 },
    { id: 'len12', label: '12+ recommended for user-chosen', pass: pw.length >= 12 },
    { id: 'notcommon', label: 'Not a well-known breached password', pass: !COMMON.has(lower) },
    { id: 'norepeat', label: 'No long repeated characters (aaaa)', pass: !repeated },
    { id: 'noseq', label: 'No obvious sequence (123, abc)', pass: !sequential },
    { id: 'maxlen', label: 'Within a 64-character maximum', pass: pw.length <= 64 },
  ]
}
