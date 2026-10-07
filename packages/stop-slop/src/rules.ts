export interface AntiSlopRule {
  id: number;
  name: string;
  category: 'prose' | 'structure' | 'ui' | 'tone';
  forbiddenPatterns: (string | RegExp)[];
  replacementAdvice: string;
}

export const ANTI_SLOP_RULES: AntiSlopRule[] = [
  {
    id: 1,
    name: 'Cut Filler & Throat-Clearing Openers',
    category: 'prose',
    forbiddenPatterns: [
      /\bIn today's fast-paced\b/i,
      /\bIt is important to remember\b/i,
      /\bDelve into\b/i,
      /\bAt the end of the day\b/i,
      /\bIn order to\b/i,
      /\bWithout further ado\b/i,
      /\bIn conclusion, it is clear\b/i,
    ],
    replacementAdvice: 'Start directly with concrete nouns and verifiable technical outcomes.'
  },
  {
    id: 2,
    name: 'Break Formulaic Structures',
    category: 'structure',
    forbiddenPatterns: [
      /\bNot only [^,]+, but also\b/i,
      /\bWhy does this matter\? Because\b/i,
      /\bWhether you're a [^,]+ or a\b/i,
    ],
    replacementAdvice: 'Eliminate false rhetorical devices and binary comparisons.'
  },
  {
    id: 3,
    name: 'Active Voice & Concrete Specificity',
    category: 'prose',
    forbiddenPatterns: [
      /\benhances user experience\b/i,
      /\bstreamlines workflows\b/i,
      /\brobust solution\b/i,
      /\bseamlessly integrated\b/i,
    ],
    replacementAdvice: 'State exact measurements, algorithms, and latency improvements.'
  },
  {
    id: 4,
    name: 'Cut Marketing Platitudes & Quotables',
    category: 'tone',
    forbiddenPatterns: [
      /\bgame changer\b/i,
      /\bunleash the power\b/i,
      /\btake your .* to the next level\b/i,
      /\btransformative journey\b/i,
    ],
    replacementAdvice: 'Speak like an engineer with skin in the game, not a marketing copywriter.'
  },
  {
    id: 5,
    name: 'Eliminate AI Visual Tells in UI',
    category: 'ui',
    forbiddenPatterns: [
      /\brounded-full py-1 px-3\b/i, // overuse of pill buttons
      /\bshadow-purple-500\/50\b/i, // neon magenta/purple AI glow
      /\bask ai assistant\b/i, // intrusive unrequested chatbot
    ],
    replacementAdvice: 'Use clean typography, authentic spacing scales, and purpose-built components.'
  }
];
