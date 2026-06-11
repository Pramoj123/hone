import { baseTemplate, S } from './base.template';

export interface ProgramAssignedData {
  memberName: string;
  trainerName: string;
  gymName: string;
  workoutName: string;
  scheduledDate: string;              // pre-formatted: "Monday, June 9"
  targetSets: number | null;
  targetReps: number | null;
  targetDurationMinutes: number | null;
  muscleGroups: string[];
  programDetailUrl: string;           // deep link: /dashboard/programs/[id]
}

export function programAssignedTemplate(data: ProgramAssignedData): { subject: string; html: string } {
  const subject = `New workout assigned — ${data.workoutName}`;
  const preheader = `${data.trainerName} assigned you ${data.workoutName} for ${data.scheduledDate}`;

  // Target line — only render if at least one is present
  const targetParts: string[] = [];
  if (data.targetSets !== null && data.targetReps !== null) {
    targetParts.push(`${data.targetSets} sets &times; ${data.targetReps} reps`);
  } else if (data.targetSets !== null) {
    targetParts.push(`${data.targetSets} sets`);
  } else if (data.targetReps !== null) {
    targetParts.push(`${data.targetReps} reps`);
  }
  const targetLine = targetParts.length > 0
    ? infoRow('Target', targetParts.join(', '), false)
    : '';

  const durationLine = data.targetDurationMinutes !== null
    ? infoRow('Duration', `~${data.targetDurationMinutes} min`, false)
    : '';

  const musclePills = data.muscleGroups.length > 0
    ? data.muscleGroups.map((m) => `<span style="${S.pill}">${m}</span>`).join('')
    : '';
  const musclesLine = musclePills
    ? `<tr>
        <td colspan="2" style="padding:10px 0 0 0;">
          <p style="${S.label}">Muscles</p>
          <div>${musclePills}</div>
        </td>
      </tr>`
    : '';

  const content = `
    <p style="${S.p}">Hi <strong style="${S.strong}">${data.memberName}</strong>,</p>
    <p style="${S.p}">
      <strong style="${S.strong}">${data.trainerName}</strong> at <strong style="${S.strong}">${data.gymName}</strong>
      has assigned you a new workout program.
    </p>

    <!-- Workout card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border-collapse:collapse;${S.infoBox}">
      <tr>
        <td colspan="2" style="padding-bottom:12px;">
          <p style="${S.h2}">${data.workoutName}</p>
        </td>
      </tr>
      ${infoRow('Scheduled', data.scheduledDate, false)}
      ${targetLine}
      ${durationLine}
      ${musclesLine}
    </table>

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;${S.btnWrapper}">
      <tr>
        <td>
          <a href="${data.programDetailUrl}" style="${S.btn}" target="_blank">View workout</a>
        </td>
      </tr>
    </table>

    <p style="${S.pMuted}">
      Questions? Reply to your trainer <strong style="color:#374151;">${data.trainerName}</strong> directly.
    </p>
  `;

  return { subject, html: baseTemplate(content, preheader, data.gymName) };
}

// ── Helper: two-column info row ───────────────────────────────────────────────

function infoRow(label: string, value: string, isLast: boolean): string {
  const rowStyle = isLast ? S.infoRowLast : S.infoRow;
  return `
    <tr>
      <td style="${rowStyle}width:130px;vertical-align:top;">
        <p style="${S.label}">${label}</p>
      </td>
      <td style="${rowStyle}vertical-align:top;">
        <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;color:#1a1a1a;margin:0;line-height:1.5;">${value}</p>
      </td>
    </tr>`;
}
