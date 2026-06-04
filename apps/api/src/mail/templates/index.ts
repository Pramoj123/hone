const BASE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f1117;
  color: #e5e7eb;
  padding: 40px 20px;
  margin: 0;
`;

const CARD = `
  background: #1a1d27;
  border-radius: 12px;
  max-width: 520px;
  margin: 0 auto;
  overflow: hidden;
`;

const HEADER = `
  background: #ccff00;
  padding: 28px 32px;
  text-align: center;
`;

const BODY = `padding: 32px;`;

const H1 = `font-size: 22px; font-weight: 700; color: #0f1117; margin: 0;`;
const H2 = `font-size: 18px; font-weight: 600; color: #f9fafb; margin: 0 0 8px;`;
const P = `font-size: 15px; line-height: 1.6; color: #9ca3af; margin: 0 0 16px;`;
const P_DARK = `font-size: 15px; line-height: 1.6; color: #e5e7eb; margin: 0 0 16px;`;

const BTN = `
  display: inline-block;
  background: #ccff00;
  color: #0f1117;
  font-weight: 700;
  font-size: 15px;
  padding: 12px 28px;
  border-radius: 8px;
  text-decoration: none;
  margin-top: 8px;
`;

const DIVIDER = `border: none; border-top: 1px solid #2d3148; margin: 24px 0;`;

const FOOTER = `
  text-align: center;
  font-size: 12px;
  color: #4b5563;
  padding: 0 32px 24px;
`;

function layout(headerText: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE}">
  <div style="${CARD}">
    <div style="${HEADER}">
      <span style="${H1}">🏋️ ${headerText}</span>
    </div>
    <div style="${BODY}">
      ${body}
    </div>
    <hr style="${DIVIDER}">
    <div style="${FOOTER}">
      <p style="margin:0">You received this because you're a Hone member. © ${new Date().getFullYear()} Hone Fitness</p>
    </div>
  </div>
</body>
</html>`;
}

export function welcomeEmail(opts: { name: string; email: string; appUrl: string }): { subject: string; html: string } {
  return {
    subject: 'Welcome to Hone — your fitness journey starts now',
    html: layout('Welcome to Hone', `
      <p style="${P_DARK}">Hi <strong>${opts.name}</strong>,</p>
      <p style="${P}">Your Hone account is ready. Log in to view your workout programs, track progress, and check your weekly assessments.</p>
      <p style="${P}">Account email: <strong style="color:#e5e7eb">${opts.email}</strong></p>
      <a href="${opts.appUrl}/login" style="${BTN}">Go to your dashboard</a>
    `),
  };
}

export function programAssignedEmail(opts: {
  clientName: string;
  trainerName: string;
  workoutName: string;
  scheduledDate?: string | null;
  notes?: string | null;
  appUrl: string;
}): { subject: string; html: string } {
  const schedLine = opts.scheduledDate
    ? `<p style="${P}">Scheduled: <strong style="color:#e5e7eb">${new Date(opts.scheduledDate).toDateString()}</strong></p>`
    : '';
  const notesLine = opts.notes
    ? `<p style="${P}">Trainer notes: <em style="color:#d1d5db">${opts.notes}</em></p>`
    : '';

  return {
    subject: `New workout assigned: ${opts.workoutName}`,
    html: layout('New Program Assigned', `
      <p style="${P_DARK}">Hi <strong>${opts.clientName}</strong>,</p>
      <p style="${P}">Your trainer <strong style="color:#e5e7eb">${opts.trainerName}</strong> has assigned a new workout program to you.</p>
      <div style="background:#0f1117;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
        <p style="${H2}">${opts.workoutName}</p>
        ${schedLine}
        ${notesLine}
      </div>
      <a href="${opts.appUrl}/dashboard/programs" style="${BTN}">View your programs</a>
    `),
  };
}

export function assessmentReadyEmail(opts: {
  clientName: string;
  trainerName: string;
  weekNumber: number;
  year: number;
  overallRating?: number | null;
  goalsNextWeek?: string | null;
  appUrl: string;
}): { subject: string; html: string } {
  const ratingLine = opts.overallRating != null
    ? `<p style="${P}">Overall rating: <strong style="color:#ccff00">${opts.overallRating}/10</strong></p>`
    : '';
  const goalsLine = opts.goalsNextWeek
    ? `<p style="${P}">Goals for next week: <em style="color:#d1d5db">${opts.goalsNextWeek}</em></p>`
    : '';

  return {
    subject: `Your Week ${opts.weekNumber} assessment is ready`,
    html: layout('Weekly Assessment', `
      <p style="${P_DARK}">Hi <strong>${opts.clientName}</strong>,</p>
      <p style="${P}">Your trainer <strong style="color:#e5e7eb">${opts.trainerName}</strong> has completed your Week ${opts.weekNumber} assessment for ${opts.year}.</p>
      <div style="background:#0f1117;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
        ${ratingLine}
        ${goalsLine}
      </div>
      <a href="${opts.appUrl}/dashboard/assessments" style="${BTN}">View assessment</a>
    `),
  };
}

export function staffInviteEmail(opts: {
  name: string;
  gymName: string;
  role: string;
  inviteUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `You've been invited to join ${opts.gymName} on Hone`,
    html: layout(`Welcome to ${opts.gymName}`, `
      <p style="${P_DARK}">Hi <strong>${opts.name}</strong>,</p>
      <p style="${P}">You've been added to <strong style="color:#e5e7eb">${opts.gymName}</strong> as a <strong style="color:#ccff00">${opts.role}</strong> on the Hone fitness platform.</p>
      <p style="${P}">Click the button below to set your password and activate your account. This link expires in <strong style="color:#e5e7eb">48 hours</strong>.</p>
      <a href="${opts.inviteUrl}" style="${BTN}">Activate my account</a>
      <p style="margin-top:24px;${P}">If you weren't expecting this invitation, you can safely ignore this email.</p>
    `),
  };
}

export function memberInviteEmail(opts: {
  name: string;
  gymName: string;
  inviteUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Your ${opts.gymName} membership is ready on Hone`,
    html: layout(`You've been added to ${opts.gymName}`, `
      <p style="${P_DARK}">Hi <strong>${opts.name}</strong>,</p>
      <p style="${P}">Your gym <strong style="color:#e5e7eb">${opts.gymName}</strong> has set you up on Hone — your fitness tracking platform for programs, workouts, and assessments.</p>
      <p style="${P}">Set your own password to get started. This link expires in <strong style="color:#e5e7eb">48 hours</strong>.</p>
      <a href="${opts.inviteUrl}" style="${BTN}">Set my password</a>
    `),
  };
}

export function emailVerificationEmail(opts: { name: string; verifyUrl: string }): { subject: string; html: string } {
  return {
    subject: 'Verify your Hone email address',
    html: layout('Confirm Your Email', `
      <p style="${P_DARK}">Hi <strong>${opts.name}</strong>,</p>
      <p style="${P}">Thanks for joining Hone! Please verify your email address to unlock all features.</p>
      <a href="${opts.verifyUrl}" style="${BTN}">Verify email address</a>
      <p style="margin-top:24px;${P}">This link is valid for 24 hours. If you didn't create a Hone account, you can ignore this email.</p>
    `),
  };
}

export function passwordResetEmail(opts: { name: string; resetUrl: string }): { subject: string; html: string } {
  return {
    subject: 'Reset your Hone password',
    html: layout('Reset Your Password', `
      <p style="${P_DARK}">Hi <strong>${opts.name}</strong>,</p>
      <p style="${P}">We received a request to reset your Hone account password. Click the button below to choose a new password. This link expires in <strong style="color:#e5e7eb">1 hour</strong>.</p>
      <a href="${opts.resetUrl}" style="${BTN}">Reset password</a>
      <p style="margin-top:24px;${P}">If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
    `),
  };
}

export function passwordChangedEmail(opts: { name: string }): { subject: string; html: string } {
  return {
    subject: 'Your Hone password was changed',
    html: layout('Password Changed', `
      <p style="${P_DARK}">Hi <strong>${opts.name}</strong>,</p>
      <p style="${P}">Your Hone account password was successfully changed. If you made this change, no action is needed.</p>
      <p style="${P}">If you did <strong>not</strong> make this change, please contact your gym admin immediately or reply to this email.</p>
    `),
  };
}
