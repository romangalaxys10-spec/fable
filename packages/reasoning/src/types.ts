import { ExplainabilityModel } from '../../core/src/types';

export interface ReasoningPromptOptions<T = any> {
  task: string;
  systemContext?: string;
  schema?: Record<string, any>;
  temperature?: number;
  maxTokens?: number;
  deterministicRules?: (input: string) => T | null;
}

export interface ReasoningResult<T = any> extends ExplainabilityModel<T> {
  providerName: string;
  latencyMs: number;
  tokensUsed?: { prompt: number; completion: number; total: number };
}

export interface IReasoningProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  reason<T = any>(options: ReasoningPromptOptions<T>): Promise<ReasoningResult<T>>;
}
