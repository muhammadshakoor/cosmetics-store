export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || /^(your[_-]|secret123|lumina_dev_fallback)/i.test(secret)) {
    throw new Error('JWT_SECRET must be a strong, non-placeholder secret of at least 32 characters.');
  }
  return secret;
}
