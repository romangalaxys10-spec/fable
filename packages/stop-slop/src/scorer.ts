import { ANTI_SLOP_RULES } from './rules';

export interface SlopScoreReport {
  score: number; // 0 - 50
  verdict: 'EXCEPTIONAL_CRAFT' | 'ACCEPTABLE' | 'SLOP_DETECTED';
  detectedViolations: {
    ruleId: number;
    ruleName: string;
    matchedSnippet: string;
    advice: string;
  }[];
  dimensionScores: {
    voiceAndAuthenticity: number; // /10
    specificityAndEvidence: number; // /10
    structuralVariation: number; // /10
    densityAndUtility: number; // /10
    layoutAndVisualCraft: number; // /10
  };
  recommendedRewriteAdvice?: string[];
}

export function evaluateTextForSlop(text: string): SlopScoreReport {
  const violations: SlopScoreReport['detectedViolations'] = [];

  for (const rule of ANTI_SLOP_RULES) {
    for (const pattern of rule.forbiddenPatterns) {
      if (typeof pattern === 'string') {
        if (text.toLowerCase().includes(pattern.toLowerCase())) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            matchedSnippet: pattern,
            advice: rule.replacementAdvice
          });
        }
      } else {
        const match = pattern.exec(text);
        if (match) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            matchedSnippet: match[0],
            advice: rule.replacementAdvice
          });
        }
      }
    }
  }

  // Deduct 5 points per violation
  const penalty = violations.length * 6;
  const rawScore = Math.max(10, 50 - penalty);

  const voice = Math.max(2, Math.round(10 - violations.filter(v => v.ruleId === 1 || v.ruleId === 4).length * 3));
  const specificity = Math.max(2, Math.round(10 - violations.filter(v => v.ruleId === 3).length * 3));
  const structure = Math.max(2, Math.round(10 - violations.filter(v => v.ruleId === 2).length * 3));
  const density = Math.max(2, Math.round(10 - violations.length * 1.5));
  const layout = 10;

  const score = Math.min(50, Math.round(voice + specificity + structure + density + layout));

  let verdict: SlopScoreReport['verdict'] = 'EXCEPTIONAL_CRAFT';
  if (score < 35) {
    verdict = 'SLOP_DETECTED';
  } else if (score < 42) {
    verdict = 'ACCEPTABLE';
  }

  return {
    score,
    verdict,
    detectedViolations: violations,
    dimensionScores: {
      voiceAndAuthenticity: voice,
      specificityAndEvidence: specificity,
      structuralVariation: structure,
      densityAndUtility: density,
      layoutAndVisualCraft: layout
    },
    recommendedRewriteAdvice: violations.map(v => v.advice)
  };
}
