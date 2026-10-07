export interface ZeroConfigProxyOptions {
  serviceName: string;
  requiredKeyEnvVar?: string;
  fallbackSimulation: any;
}

export class ZeroConfigBypass {
  static executeWithBypass<T>(options: ZeroConfigProxyOptions, liveExecutionFn?: () => T): T {
    const envVar = options.requiredKeyEnvVar;
    const hasKey = envVar && process.env[envVar] && process.env[envVar] !== 'placeholder_key' && process.env[envVar] !== '';

    if (hasKey && liveExecutionFn) {
      try {
        return liveExecutionFn();
      } catch (err) {
        console.warn(`[ZeroConfigBypass] Live execution for ${options.serviceName} failed. Falling back to local offline simulation:`, err);
        return options.fallbackSimulation;
      }
    }

    // Zero-config offline simulation mode
    return {
      ...options.fallbackSimulation,
      _zeroConfigNotice: `[Auto-Bypassed] Service '${options.serviceName}' executed in Zero-Config Local Simulation mode (no ${envVar || 'API Key'} required).`
    };
  }
}
