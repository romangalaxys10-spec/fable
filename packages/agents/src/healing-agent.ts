import { evaluateHealing, HealProposal, HealRequest } from '../../healing/src/healer';

export class SelfHealingAgent {
  proposeHealing(request: HealRequest): HealProposal {
    return evaluateHealing(request);
  }

  evaluateBatch(requests: HealRequest[]): {
    totalEvaluated: number;
    autoApplicableCount: number;
    requiresReviewCount: number;
    proposals: HealProposal[];
  } {
    const proposals = requests.map(r => this.proposeHealing(r));
    const autoApplicable = proposals.filter(p => p.canAutoApply);

    return {
      totalEvaluated: proposals.length,
      autoApplicableCount: autoApplicable.length,
      requiresReviewCount: proposals.length - autoApplicable.length,
      proposals
    };
  }
}
