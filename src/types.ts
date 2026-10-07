export interface EngineStatus {
  status: string;
  type?: string;
  count?: number;
  path?: string;
  latency?: string;
  hardware?: string;
  note?: string;
  engine?: string;
  compression?: string;
  loop?: string;
  dir?: string;
  policy?: string;
}

export interface SystemStatus {
  ok: boolean;
  platform: string;
  arch: string;
  nodeVersion: string;
  engines: {
    retrieval: EngineStatus;
    corpus: EngineStatus;
    laya: EngineStatus;
    headroom: EngineStatus;
    smartScaffold: EngineStatus;
    vimax: EngineStatus;
    securityGate: EngineStatus;
  };
  datasets: Array<{
    id: string;
    traces: string | number;
    type: string;
  }>;
}

export interface RoutingRecommendation {
  engine: string;
  status: 'run' | 'skip';
  reason: string;
}

export interface RoutingPlan {
  task: string;
  mode: 'ULTRA' | 'BOOST' | 'SMART' | 'VIDEO';
  timestamp: string;
  recommendations: RoutingRecommendation[];
  commands: string[];
}

export interface LessonCard {
  ts: string;
  task: string;
  context: string;
  outcome: string;
  key_steps: string[];
  gotchas: string[];
  learnings: string[];
  score?: number;
}

export interface FableTrace {
  dataset: string;
  id: string;
  score: number;
  task_type: string;
  prompt: string;
  solution_summary: string;
  tokens: number;
  quality_rating: string;
}

export interface RetrievalResult {
  task: string;
  total_retrieved: number;
  latency_ms: number;
  datasets_queried: number;
  results: FableTrace[];
}

export interface BoostStage {
  stage: string;
  duration_ms: number;
  status: string;
  candidates?: number;
  approved?: number;
  rejected?: number;
  model?: string;
  engine?: string;
}

export interface BoostResult {
  task: string;
  pipeline: BoostStage[];
  token_economy: {
    initial_tokens: number;
    compressed_tokens: number;
    tokens_saved: number;
    compression_ratio: string;
    estimated_speedup: string;
    token_cost_reduction: string;
  };
}

export interface WarRoomStage {
  id: number;
  name: string;
  status: 'ready' | 'pending' | 'in_progress' | 'verified';
  description: string;
}

export interface WarRoom {
  slug: string;
  path: string;
  task_md: string;
  notes_md: string;
  gvs5h_stages: WarRoomStage[];
}
