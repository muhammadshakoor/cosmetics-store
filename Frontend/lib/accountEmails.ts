import { getSiteUrl } from './accountTokens';
import { escapeHtml, sendEmail } from './email';

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const link = `${getSiteUrl()}/verify-email?${new URLSearchParams({ token })}`;
  await sendEmail({
    to,
    subject: 'Verify your Lumina account',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px"><h1>Welcome to Lumina</h1><p>Hi ${escapeHtml(name)},</p><p>Verify your email address to activate your account. This link expires in 24 hours.</p><p><a href="${escapeHtml(link)}">Verify my email</a></p><p>If you did not create this account, you can ignore this email.</p></div>`,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const link = `${getSiteUrl()}/reset-password?${new URLSearchParams({ token })}`;
  await sendEmail({
    to,
    subject: 'Reset your Lumina password',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px"><h1>Reset your password</h1><p>Hi ${escapeHtml(name)},</p><p>Use the link below to choose a new password. This link expires in 30 minutes and can be used once.</p><p><a href="${escapeHtml(link)}">Reset my password</a></p><p>If you did not request this, you can ignore this email. Your password has not changed.</p></div>`,
  });
}
