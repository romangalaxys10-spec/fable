export interface JUnitTestSuite {
  name: string;
  tests: number;
  failures: number;
  errors: number;
  skipped: number;
  timeSeconds: number;
  testCases: {
    classname: string;
    name: string;
    timeSeconds: number;
    failure?: { message: string; stack?: string };
    skipped?: boolean;
  }[];
}

export function generateJUnitXml(suites: JUnitTestSuite[]): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<testsuites>'];

  for (const s of suites) {
    lines.push(
      `  <testsuite name="${escapeXml(s.name)}" tests="${s.tests}" failures="${s.failures}" errors="${s.errors}" skipped="${s.skipped}" time="${s.timeSeconds.toFixed(3)}">`
    );
    for (const tc of s.testCases) {
      lines.push(`    <testcase classname="${escapeXml(tc.classname)}" name="${escapeXml(tc.name)}" time="${tc.timeSeconds.toFixed(3)}">`);
      if (tc.failure) {
        lines.push(`      <failure message="${escapeXml(tc.failure.message)}">`);
        lines.push(`        <![CDATA[${tc.failure.stack || tc.failure.message}]]>`);
        lines.push(`      </failure>`);
      } else if (tc.skipped) {
        lines.push(`      <skipped/>`);
      }
      lines.push(`    </testcase>`);
    }
    lines.push(`  </testsuite>`);
  }

  lines.push('</testsuites>');
  return lines.join('\n');
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
