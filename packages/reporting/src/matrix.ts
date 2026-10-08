export interface TraceabilityRequirement {
  id: string;
  title: string;
  riskTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  quadrantsCovered: ('POSITIVE' | 'NEGATIVE' | 'BOUNDARY' | 'SECURITY')[];
  linkedTestIds: string[];
  status: 'VERIFIED' | 'PENDING' | 'FAILED';
}

export function generateTraceabilityMatrixMarkdown(requirements: TraceabilityRequirement[]): string {
  const lines: string[] = [];
  lines.push(`# 📋 qaforge Quality Traceability Matrix`);
  lines.push('');
  lines.push('| Req ID | Requirement Title | Risk | Quadrants Covered | Linked Tests | Status |');
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');

  for (const r of requirements) {
    const quadrants = r.quadrantsCovered.join(', ');
    const tests = r.linkedTestIds.join(', ') || 'None';
    const icon = r.status === 'VERIFIED' ? '🟢 VERIFIED' : r.status === 'FAILED' ? '🔴 FAILED' : '🟡 PENDING';
    lines.push(`| \`${r.id}\` | ${r.title} | **${r.riskTier}** | ${quadrants} | \`${tests}\` | ${icon} |`);
  }

  lines.push('');
  lines.push(`*Generated autonomously by qaforge AI-Native QA Operating System v2.1.0*`);
  return lines.join('\n');
}
