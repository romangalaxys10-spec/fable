export function formatGitHubStepSummary(data: {
  title: string;
  verdict: string;
  score: number;
  stats: { total: number; passed: number; failed: number; skipped: number; quarantined: number };
  gates: Record<string, string>;
  failures: { name: string; category: string; rootCause: string }[];
}): string {
  const lines: string[] = [];
  lines.push(`## 🛡️ qaforge QA Operating System Gate: **${data.verdict}** (Score: ${data.score}/100)`);
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| :--- | :--- |');
  lines.push(`| **Total Tests** | ${data.stats.total} |`);
  lines.push(`| **Passed** | 🟢 ${data.stats.passed} |`);
  lines.push(`| **Failed** | 🔴 ${data.stats.failed} |`);
  lines.push(`| **Quarantined Flakes** | 🟡 ${data.stats.quarantined} |`);
  lines.push('');
  lines.push('### Quality Gate Invariants');
  for (const [k, v] of Object.entries(data.gates)) {
    lines.push(`- **${k}**: \`${v}\``);
  }

  if (data.failures.length > 0) {
    lines.push('');
    lines.push('### Failure Triage Summary');
    lines.push('| Test | Category | Root Cause |');
    lines.push('| :--- | :--- | :--- |');
    for (const f of data.failures) {
      lines.push(`| \`${f.name}\` | **${f.category}** | ${f.rootCause} |`);
    }
  }

  return lines.join('\n');
}
