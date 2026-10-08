export function formatGitLabCodeQuality(issues: {
  description: string;
  fingerprint: string;
  severity: 'info' | 'minor' | 'major' | 'critical' | 'blocker';
  path: string;
  line?: number;
}[]) {
  return issues.map(iss => ({
    description: `[qaforge] ${iss.description}`,
    check_name: 'qaforge-quality-gate',
    fingerprint: iss.fingerprint,
    severity: iss.severity,
    location: {
      path: iss.path,
      lines: {
        begin: iss.line || 1
      }
    }
  }));
}
