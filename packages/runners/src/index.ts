import { ITestRunner } from './types';
import { PlaywrightRunner } from './playwright-runner';
import { PytestRunner } from './pytest-runner';
import { K6PerformanceRunner } from './k6-runner';
import { OwaspZapRunner } from './zap-runner';
import { AppiumMobileRunner } from './appium-runner';

export * from './types';
export * from './playwright-runner';
export * from './pytest-runner';
export * from './k6-runner';
export * from './zap-runner';
export * from './appium-runner';

export function getRunner(type: 'playwright' | 'pytest' | 'k6' | 'zap' | 'appium'): ITestRunner {
  switch (type) {
    case 'playwright':
      return new PlaywrightRunner();
    case 'pytest':
      return new PytestRunner();
    case 'k6':
      return new K6PerformanceRunner();
    case 'zap':
      return new OwaspZapRunner();
    case 'appium':
      return new AppiumMobileRunner();
    default:
      return new PlaywrightRunner();
  }
}
