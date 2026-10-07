import { calculateRisk, RiskAnalysisResult } from '../../core/src/risk';

export interface RequirementRiskProfile {
  requirementId: string;
  title: string;
  risk: RiskAnalysisResult;
  isP0Critical: boolean;
}

export class RequirementsRiskAgent {
  analyzeRequirement(req: { id: string; title: string; criteria: string[] }): RequirementRiskProfile {
    const combined = `${req.title} ${req.criteria.join(' ')}`;
    const risk = calculateRisk({}, combined);
    const isP0Critical = risk.tier === 'critical' || risk.score >= 80;

    return {
      requirementId: req.id,
      title: req.title,
      risk,
      isP0Critical
    };
  }

  batchAnalyze(requirements: { id: string; title: string; criteria: string[] }[]): RequirementRiskProfile[] {
    return requirements.map(r => this.analyzeRequirement(r));
  }
}
