export interface StrategyPlan {
  featureName: string;
  recommendedPyramid: {
    unit: number; // percentage
    integration: number;
    e2e: number;
  };
  rationale: string;
  penaltiesApplied: string[];
  recommendedLayers: {
    layer: 'unit' | 'integration' | 'e2e' | 'performance' | 'security';
    target: string;
    tooling: string;
  }[];
}

export class TestStrategyAgent {
  determineStrategy(featureName: string, riskTier: 'critical' | 'high' | 'medium' | 'low'): StrategyPlan {
    const text = featureName.toLowerCase();
    const penalties: string[] = [];

    // Heuristics for pyramid distribution
    let unit = 70;
    let integration = 20;
    let e2e = 10;

    if (/calculation|pricing|math|algorithm|validator|parser|utility/i.test(text)) {
      unit = 85;
      integration = 15;
      e2e = 0;
      penalties.push('Penalized E2E: Pure calculation logic must be tested 100% via millisecond unit tests without browser overhead.');
    } else if (/payment|checkout|stripe|order|billing/i.test(text)) {
      unit = 50;
      integration = 35;
      e2e = 15;
      penalties.push('Heavy integration priority: Contract verification against payment gateways and database write transactions.');
    } else if (/ui|modal|button|theme|css|layout/i.test(text)) {
      unit = 40;
      integration = 20;
      e2e = 40;
      penalties.push('Visual & DOM priority: Layout and user interaction require focused Playwright component/E2E verification.');
    }

    return {
      featureName,
      recommendedPyramid: { unit, integration, e2e },
      rationale: `Derived strategy based on ${riskTier.toUpperCase()} risk profile and domain semantics.`,
      penaltiesApplied: penalties,
      recommendedLayers: [
        { layer: 'unit', target: 'Business invariants & edge cases', tooling: 'Vitest / Jest' },
        { layer: 'integration', target: 'API contracts & persistence', tooling: 'Supertest / APIRequestContext' },
        { layer: 'e2e', target: 'Critical happy paths & user workflows', tooling: 'Playwright (zero-sleep)' },
      ]
    };
  }
}
