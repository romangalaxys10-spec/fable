import { IReasoningProvider, ReasoningPromptOptions, ReasoningResult } from './types';
import { DeterministicReasoningProvider } from './deterministic-provider';

export class MultiModelReasoningRouter implements IReasoningProvider {
  readonly name = 'MultiModelReasoningRouter';
  private deterministic = new DeterministicReasoningProvider();

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async reason<T = any>(options: ReasoningPromptOptions<T>): Promise<ReasoningResult<T>> {
    // 1. DETERMINISTIC FIRST, AI SECOND principle
    if (options.deterministicRules) {
      const direct = options.deterministicRules(options.task);
      if (direct !== null) {
        return this.deterministic.reason(options);
      }
    }

    // 2. If provider environment keys present (e.g. GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY)
    // we would invoke external models, otherwise cleanly fall back to high-confidence deterministic synthesis.
    return this.deterministic.reason(options);
  }
}
