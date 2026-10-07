export interface GoldenRule {
  id: number;
  name: string;
  summary: string;
  check: (operation: string, payload: any) => { pass: boolean; violation?: string };
}

export const GOLDEN_RULES: GoldenRule[] = [
  {
    id: 1,
    name: 'Preserve Assertion Strength',
    summary: 'Never weaken an assertion to make a test pass.',
    check: (op, payload) => {
      if (op === 'heal' && payload?.assertionWeakened) {
        return { pass: false, violation: 'Attempted to loosen assertion threshold or replace strict equality with truthy check.' };
      }
      return { pass: true };
    }
  },
  {
    id: 2,
    name: 'No Regression Masking',
    summary: 'Never hide a regression behind retries.',
    check: (op, payload) => {
      if (payload?.retryCount > 3 && payload?.category === 'REAL_REGRESSION') {
        return { pass: false, violation: 'Real product regression detected; retrying to force green status is strictly prohibited.' };
      }
      return { pass: true };
    }
  },
  {
    id: 3,
    name: 'Zero Arbitrary Sleeps',
    summary: 'Never use arbitrary sleeps (waitForTimeout) as first fix.',
    check: (op, payload) => {
      if (typeof payload?.code === 'string' && /waitForTimeout|time\.sleep\(|sleep\(\d+\)/.test(payload.code)) {
        return { pass: false, violation: 'Prohibited arbitrary sleep call detected in generated test code.' };
      }
      return { pass: true };
    }
  },
  {
    id: 4,
    name: 'Evidence-Backed Verification',
    summary: 'Never claim verification without execution evidence.',
    check: (op, payload) => {
      if (payload?.status === 'CONFIRMED' && !payload?.evidenceRunId) {
        return { pass: false, violation: 'Verification claimed without corresponding test run execution ID or artifact bundle.' };
      }
      return { pass: true };
    }
  },
  {
    id: 5,
    name: 'Test Pyramid Discipline',
    summary: 'Never generate massive redundant E2E suites (penalize inverted pyramid).',
    check: (op, payload) => {
      if (payload?.e2eRatio > 0.4) {
        return { pass: false, violation: 'E2E test proportion exceeds 40% of generated suite. Move unit-verifiable logic down the pyramid.' };
      }
      return { pass: true };
    }
  },
  {
    id: 6,
    name: 'Pristine Isolation',
    summary: 'Never destroy test isolation for speed.',
    check: (op, payload) => {
      if (payload?.sharedMutableState) {
        return { pass: false, violation: 'Shared mutable state detected across test fixtures.' };
      }
      return { pass: true };
    }
  },
  {
    id: 7,
    name: 'Conservative Deletion',
    summary: 'Never auto-delete tests without strong evidence.',
    check: (op, payload) => {
      if (op === 'delete_test' && !payload?.confirmedDuplicateEvidence) {
        return { pass: false, violation: 'Deleting existing test requires high-confidence duplicate evidence.' };
      }
      return { pass: true };
    }
  },
  {
    id: 8,
    name: 'Zero Secrets in Artifacts',
    summary: 'Never expose secrets in test artifacts or evidence bundles.',
    check: (op, payload) => {
      const text = JSON.stringify(payload || '');
      if (/bearer\s+[a-z0-9_-]{20,}|api[_-]?key["':\s]+[a-z0-9_-]{16,}|ghp_[a-z0-9]{30,}/i.test(text)) {
        return { pass: false, violation: 'Potential API key or secret token detected in artifact payload.' };
      }
      return { pass: true };
    }
  },
  {
    id: 9,
    name: 'Protected Production',
    summary: 'Never perform destructive production actions without explicit confirmation.',
    check: (op, payload) => {
      if (payload?.environment === 'production' && payload?.destructive && !payload?.userConfirmed) {
        return { pass: false, violation: 'Destructive production operation requires explicit user authorization.' };
      }
      return { pass: true };
    }
  },
  {
    id: 10,
    name: 'Defect Categorization',
    summary: 'Always distinguish product defects from test defects.',
    check: () => ({ pass: true })
  },
  {
    id: 11,
    name: 'Minimal Defect Catcher',
    summary: 'Prefer the smallest test that catches the defect.',
    check: () => ({ pass: true })
  },
  {
    id: 12,
    name: 'Deterministic Reproducibility',
    summary: 'Preserve reproducibility with fixed seeds and explicit clocks.',
    check: () => ({ pass: true })
  },
  {
    id: 13,
    name: 'Evidence Retention',
    summary: 'Preserve evidence bundles (traces, screenshots, console logs, network diffs).',
    check: () => ({ pass: true })
  },
  {
    id: 14,
    name: 'Transparent Explainability',
    summary: 'Explain important decisions (input, objective, evidence, confidence, fallback).',
    check: () => ({ pass: true })
  },
  {
    id: 15,
    name: 'Signal Optimization',
    summary: 'Optimize for signal, not test count.',
    check: () => ({ pass: true })
  }
];

export function validateGoldenRules(operation: string, payload: any): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const rule of GOLDEN_RULES) {
    const result = rule.check(operation, payload);
    if (!result.pass && result.violation) {
      violations.push(`Rule ${rule.id} [${rule.name}]: ${result.violation}`);
    }
  }
  return {
    valid: violations.length === 0,
    violations,
  };
}
