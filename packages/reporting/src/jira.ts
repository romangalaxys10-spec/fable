export function formatJiraDefectPayload(defect: {
  projectKey: string;
  summary: string;
  testId: string;
  category: string;
  rootCause: string;
  confidence: number;
  environment: string;
  errorMessage: string;
  stackTrace?: string;
  evidenceLinks?: string[];
}) {
  return {
    fields: {
      project: { key: defect.projectKey },
      summary: `[qaforge Triage] ${defect.summary}`,
      issuetype: { name: 'Bug' },
      priority: { name: defect.category === 'REAL_REGRESSION' ? 'High' : 'Medium' },
      labels: ['qaforge-auto-triage', defect.category.toLowerCase().replace(/_/g, '-')],
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: `Auto-triaged by qaforge AI-Native QA Operating System.` }
            ]
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: `Failed Test: ${defect.testId}` }] }]
              },
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: `Category: ${defect.category} (${defect.confidence}% confidence)` }] }]
              },
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: `Root Cause: ${defect.rootCause}` }] }]
              },
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: `Error: ${defect.errorMessage}` }] }]
              }
            ]
          }
        ]
      }
    }
  };
}
