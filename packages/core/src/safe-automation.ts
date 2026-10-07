import { SafetyClassification } from './types';

export interface ActionDescriptor {
  name: string;
  category: SafetyClassification;
  description: string;
  requiresUserConfirmation: boolean;
}

export const KNOWN_ACTIONS: Record<string, ActionDescriptor> = {
  inspect: {
    name: 'inspect',
    category: 'READ-ONLY',
    description: 'Inspect repository file structure, configs, and dependencies',
    requiresUserConfirmation: false,
  },
  diff: {
    name: 'diff',
    category: 'READ-ONLY',
    description: 'Analyze git diff between commits or working tree',
    requiresUserConfirmation: false,
  },
  run_tests: {
    name: 'run_tests',
    category: 'READ-ONLY',
    description: 'Execute local test suites in sandbox environment',
    requiresUserConfirmation: false,
  },
  generate_report: {
    name: 'generate_report',
    category: 'READ-ONLY',
    description: 'Compile JUnit, Markdown, or JSON quality reports',
    requiresUserConfirmation: false,
  },
  generate_tests: {
    name: 'generate_tests',
    category: 'LOW-RISK WRITE',
    description: 'Generate new test spec files under tests/',
    requiresUserConfirmation: false,
  },
  modify_test_file: {
    name: 'modify_test_file',
    category: 'LOW-RISK WRITE',
    description: 'Refactor test selectors or add missing assertions in tests/',
    requiresUserConfirmation: false,
  },
  save_evidence_artifact: {
    name: 'save_evidence_artifact',
    category: 'LOW-RISK WRITE',
    description: 'Save traces, screenshots, and logs in artifacts/',
    requiresUserConfirmation: false,
  },
  quarantine_test: {
    name: 'quarantine_test',
    category: 'LOW-RISK WRITE',
    description: 'Tag flaky test with @quarantine metadata',
    requiresUserConfirmation: false,
  },
  database_migration_execute: {
    name: 'database_migration_execute',
    category: 'HIGH-RISK',
    description: 'Execute destructive database schema migrations or drop tables',
    requiresUserConfirmation: true,
  },
  production_smoke_test: {
    name: 'production_smoke_test',
    category: 'HIGH-RISK',
    description: 'Execute state-mutating test transactions against production URLs',
    requiresUserConfirmation: true,
  },
  delete_test_suite: {
    name: 'delete_test_suite',
    category: 'HIGH-RISK',
    description: 'Delete existing test files or coverage baselines',
    requiresUserConfirmation: true,
  },
  ci_pipeline_modify: {
    name: 'ci_pipeline_modify',
    category: 'HIGH-RISK',
    description: 'Modify GitHub Actions or CI pipeline security configurations',
    requiresUserConfirmation: true,
  },
  external_webhook_notify: {
    name: 'external_webhook_notify',
    category: 'HIGH-RISK',
    description: 'Send notifications to external Slack, Discord, or Jira endpoints',
    requiresUserConfirmation: true,
  },
};

export function classifyAction(actionName: string): ActionDescriptor {
  if (KNOWN_ACTIONS[actionName]) {
    return KNOWN_ACTIONS[actionName];
  }

  // Fallback heuristics
  const lower = actionName.toLowerCase();
  if (/delete|drop|deploy|publish|prod|push/i.test(lower)) {
    return {
      name: actionName,
      category: 'HIGH-RISK',
      description: `Unregistered operation with potential destructive impact (${actionName})`,
      requiresUserConfirmation: true,
    };
  }

  if (/write|create|update|patch|heal|edit/i.test(lower)) {
    return {
      name: actionName,
      category: 'LOW-RISK WRITE',
      description: `File write or test modification operation (${actionName})`,
      requiresUserConfirmation: false,
    };
  }

  return {
    name: actionName,
    category: 'READ-ONLY',
    description: `Read-only diagnostic or inspection operation (${actionName})`,
    requiresUserConfirmation: false,
  };
}
