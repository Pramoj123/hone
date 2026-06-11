import { baseTemplate, S } from './base.template';

export interface WeeklySummaryData {
  memberName: string;
  gymName: string;
  weekLabel: string;            // "Week of June 2"
  workoutsCompleted: number;
  workoutsMissed: number;
  totalVolumeKg: number;        // rendered with comma-separator
  currentStreak: number;
  upcomingWorkouts: Array<{
    workoutName: string;
    scheduledDate: string;      // day label: "Monday", "Tuesday", etc.
  }>;
  progressUrl: string;          // deep link: /dashboard/progress
}

export function weeklySummaryTemplate(data: WeeklySummaryData): { subject: string; html: string } {
  const subject = `Your week in review — ${data.weekLabel}`;
  const preheader = `${data.workoutsCompleted} workout${data.workoutsCompleted !== 1 ? 's' : ''} done · ${data.currentStreak}-day streak`;

  const formattedVolume = Math.round(data.totalVolumeKg).toLocaleString('en-US');

  // ── Missed workouts amber banner ─────────────────────────────────────────
  const missedBanner = data.workoutsMissed > 0
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="border-collapse:collapse;margin:20px 0;">
        <tr>
          <td style="${S.amberBanner}">
            <p style="${S.amberText}">
              &#x26A0;&#xFE0F; You missed <strong>${data.workoutsMissed} workout${data.workoutsMissed !== 1 ? 's' : ''}</strong> this week.
              No worries &mdash; keep going this week!
            </p>
          </td>
        </tr>
      </table>`
    : '';

  // ── Upcoming workouts list ────────────────────────────────────────────────
  const upcomingRows = data.upcomingWorkouts.length > 0
    ? data.upcomingWorkouts
        .slice(0, 3)
        .map(
          (w, i) => `
          <tr>
            <td style="padding:9px 0;${i < data.upcomingWorkouts.length - 1 ? 'border-bottom:1px solid #e5e7eb;' : ''}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="border-collapse:collapse;">
                <tr>
                  <td style="width:90px;vertical-align:top;">
                    <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;color:#6b7280;margin:0;line-height:1.5;">${w.scheduledDate}</p>
                  </td>
                  <td style="vertical-align:top;">
                    <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:500;color:#1a1a1a;margin:0;line-height:1.5;">${w.workoutName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`,
        )
        .join('')
    : `<tr>
        <td style="padding:12px 0;">
          <p style="${S.pMuted}">No workouts scheduled yet &mdash; your trainer will assign soon.</p>
        </td>
      </tr>`;

  const content = `
    <p style="${S.p}">
      Hi <strong style="${S.strong}">${data.memberName}</strong>, here&apos;s your week at a glance.
    </p>

    <!-- ── 3-stat row ─────────────────────────────────────────────── -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border-collapse:collapse;margin:20px 0;">
      <tr>
        <!-- Workouts done -->
        <td width="32%" style="${S.statBox}">
          <p style="${S.statNumber}">${data.workoutsCompleted}</p>
          <p style="${S.statLabel}">Workouts done</p>
        </td>
        <td width="2%">&nbsp;</td>
        <!-- Volume lifted -->
        <td width="32%" style="${S.statBox}">
          <p style="${S.statNumber}">${formattedVolume}</p>
          <p style="${S.statLabel}">kg lifted</p>
        </td>
        <td width="2%">&nbsp;</td>
        <!-- Current streak -->
        <td width="32%" style="${S.statBox}">
          <p style="${S.statNumber}">${data.currentStreak} &#x1F525;</p>
          <p style="${S.statLabel}">Day streak</p>
        </td>
      </tr>
    </table>

    ${missedBanner}

    <!-- ── Coming up this week ─────────────────────────────────────── -->
    <p style="${S.h2}">Coming up this week</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border-collapse:collapse;${S.infoBox}">
      <tbody>
        ${upcomingRows}
      </tbody>
    </table>

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;${S.btnWrapper}">
      <tr>
        <td>
          <a href="${data.progressUrl}" style="${S.btn}" target="_blank">View your progress</a>
        </td>
      </tr>
    </table>
  `;

  return { subject, html: baseTemplate(content, preheader, data.gymName) };
}
