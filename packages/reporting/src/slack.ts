export function formatSlackQualityPayload(summary: {
  repo: string;
  branch: string;
  commit: string;
  verdict: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL' | 'BLOCKED';
  total: number;
  passed: number;
  failed: number;
  quarantined: number;
  durationSec: number;
  riskScore: number;
}) {
  const emoji = summary.verdict === 'PASS' ? '🟢' : summary.verdict === 'PASS_WITH_WARNINGS' ? '🟡' : '🔴';

  return {
    text: `${emoji} QA Operating System Release Gate: ${summary.verdict} for ${summary.repo}@${summary.branch}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} qaforge Gate: ${summary.verdict}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Branch:* \`${summary.branch}\`` },
          { type: 'mrkdwn', text: `*Commit:* \`${summary.commit.slice(0, 7)}\`` },
          { type: 'mrkdwn', text: `*Tests:* ${summary.passed}/${summary.total} Passed` },
          { type: 'mrkdwn', text: `*Quarantined:* ${summary.quarantined}` },
          { type: 'mrkdwn', text: `*Duration:* ${summary.durationSec}s` },
          { type: 'mrkdwn', text: `*Risk Score:* ${summary.riskScore}/100` }
        ]
      }
    ]
  };
}
