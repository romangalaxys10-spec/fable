/**
 * Honest execution gate — the anti-fabrication layer.
 *
 * REPLACES the previous `ZeroConfigBypass`, which silently returned
 * `fallbackSimulation` data when credentials were missing or live execution
 * failed. That behavior violated the platform's own Golden Rule 4 ("never
 * claim verification without execution evidence") and made simulated data
 * indistinguishable from real results.
 *
 * The contract now:
 *   - missing credentials → { status: 'NOT_RUN', reason: 'REQUIRES_CREDENTIALS' }
 *   - live execution failure → the error SURFACES (status 'ERROR'); no invented payload
 *   - simulation exists only when explicitly requested (`simulate: true`) and is
 *     WATERMARKED on every record (`simulated: true`, label 'SIMULATED')
 *   - successful live execution → { status: 'OK', result } with the real output
 *
 * Nothing in this module ever invents a result.
 */

export type ExecutionStatus = 'OK' | 'NOT_RUN' | 'ERROR' | 'SIMULATED';

export interface ExecutionOutcome<T> {
  status: ExecutionStatus;
  /** Present when status === 'OK' (real result) or 'SIMULATED' (watermarked demo data). */
  result?: T;
  /** Present when status !== 'OK'. Machine-readable reason code. */
  reason?: 'REQUIRES_CREDENTIALS' | 'LIVE_EXECUTION_FAILED' | 'SIMULATION_REQUESTED';
  /** Human-readable detail; safe to embed in reports. */
  detail: string;
  /** Error detail when live execution failed (surfaced, never swallowed). */
  error?: string;
  /** True for every simulated record — callers must propagate this flag. */
  simulated?: boolean;
  /** Verification label for report envelopes. */
  label: 'OBSERVED' | 'NOT_RUN' | 'NOT_VERIFIED' | 'INFERRED';
}

export interface ExecutionGateOptions<T> {
  serviceName: string;
  /** Environment variable that must hold a real credential for live execution. */
  requiredKeyEnvVar?: string;
  /** Placeholder values that do NOT count as credentials. */
  placeholderValues?: string[];
  /**
   * Demo data. Used ONLY when `simulate: true` is explicitly passed.
   * The previous bypass reached for this automatically — that is the bug this
   * gate removes.
   */
  simulate?: T;
}

function credentialMissing(envVar: string | undefined, placeholders: string[]): boolean {
  if (envVar === undefined) return false; // service needs no credential
  const value = process.env[envVar];
  if (value === undefined || value === '') return true;
  return placeholders.some((p) => value.toLowerCase() === p.toLowerCase());
}

export class ExecutionGate {
  /** Run a live capability with honest fallback semantics. */
  static execute<T>(
    opts: ExecutionGateOptions<T>,
    liveExecutionFn?: () => T,
  ): ExecutionOutcome<T> {
    if (opts.simulate !== undefined) {
      // Explicit simulation: allowed, but watermarked everywhere.
      return {
        status: 'SIMULATED',
        result: opts.simulate,
        reason: 'SIMULATION_REQUESTED',
        detail: `simulation explicitly requested for ${opts.serviceName} — every record is watermarked simulated:true; do not present as measured results`,
        simulated: true,
        label: 'NOT_RUN',
      };
    }

    if (credentialMissing(opts.requiredKeyEnvVar, opts.placeholderValues ?? ['placeholder_key'])) {
      return {
        status: 'NOT_RUN',
        reason: 'REQUIRES_CREDENTIALS',
        detail: `${opts.serviceName} not executed: set ${opts.requiredKeyEnvVar} to run live. No simulated results are provided — absence of credentials is a status, not a dataset.`,
        label: 'NOT_RUN',
      };
    }

    if (liveExecutionFn === undefined) {
      return {
        status: 'NOT_RUN',
        reason: 'LIVE_EXECUTION_FAILED',
        detail: `${opts.serviceName} has no live implementation registered — declaring NOT_RUN instead of inventing one.`,
        label: 'NOT_RUN',
      };
    }

    try {
      const result = liveExecutionFn();
      return { status: 'OK', result, detail: `${opts.serviceName} executed live`, label: 'OBSERVED' };
    } catch (err) {
      return {
        status: 'ERROR',
        reason: 'LIVE_EXECUTION_FAILED',
        detail: `${opts.serviceName} live execution failed — surfacing the error instead of substituting simulated data.`,
        error: (err as Error).message,
        label: 'NOT_VERIFIED',
      };
    }
  }

  /** Async variant (network calls). */
  static async executeAsync<T>(
    opts: ExecutionGateOptions<T>,
    liveExecutionFn?: () => Promise<T>,
  ): Promise<ExecutionOutcome<T>> {
    if (opts.simulate !== undefined) {
      return {
        status: 'SIMULATED',
        result: opts.simulate,
        reason: 'SIMULATION_REQUESTED',
        detail: `simulation explicitly requested for ${opts.serviceName} — every record is watermarked simulated:true; do not present as measured results`,
        simulated: true,
        label: 'NOT_RUN',
      };
    }
    if (credentialMissing(opts.requiredKeyEnvVar, opts.placeholderValues ?? ['placeholder_key'])) {
      return {
        status: 'NOT_RUN',
        reason: 'REQUIRES_CREDENTIALS',
        detail: `${opts.serviceName} not executed: set ${opts.requiredKeyEnvVar} to run live. No simulated results are provided — absence of credentials is a status, not a dataset.`,
        label: 'NOT_RUN',
      };
    }
    if (liveExecutionFn === undefined) {
      return {
        status: 'NOT_RUN',
        reason: 'LIVE_EXECUTION_FAILED',
        detail: `${opts.serviceName} has no live implementation registered — declaring NOT_RUN instead of inventing one.`,
        label: 'NOT_RUN',
      };
    }
    try {
      const result = await liveExecutionFn();
      return { status: 'OK', result, detail: `${opts.serviceName} executed live`, label: 'OBSERVED' };
    } catch (err) {
      return {
        status: 'ERROR',
        reason: 'LIVE_EXECUTION_FAILED',
        detail: `${opts.serviceName} live execution failed — surfacing the error instead of substituting simulated data.`,
        error: (err as Error).message,
        label: 'NOT_VERIFIED',
      };
    }
  }
}

/**
 * Back-compat shim: the old ZeroConfigBypass name is preserved so imports do
 * not break, but its behavior is now the honest gate. `fallbackSimulation` is
 * only ever returned when the caller explicitly opts into simulation — and
 * the returned record is watermarked. There is no silent path anymore.
 */
export interface ZeroConfigProxyOptions<T = unknown> {
  serviceName: string;
  requiredKeyEnvVar?: string;
  fallbackSimulation?: T;
  /** Explicit opt-in to watermarked simulation. Default: NEVER simulate. */
  simulate?: boolean;
}

export class ZeroConfigBypass {
  static executeWithBypass<T>(options: ZeroConfigProxyOptions<T>, liveExecutionFn?: () => T): ExecutionOutcome<T> {
    return ExecutionGate.execute<T>(
      {
        serviceName: options.serviceName,
        requiredKeyEnvVar: options.requiredKeyEnvVar,
        simulate: options.simulate === true ? options.fallbackSimulation : undefined,
      },
      liveExecutionFn,
    );
  }
}
