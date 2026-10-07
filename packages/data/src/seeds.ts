export class SeedGenerator {
  private seed: number;

  constructor(seed = 1337) {
    this.seed = seed;
  }

  // Linear Congruential Generator for reproducible pseudo-random numbers
  nextFloat(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(min + this.nextFloat() * (max - min + 1));
  }

  pick<T>(items: T[]): T {
    const idx = Math.floor(this.nextFloat() * items.length);
    return items[idx];
  }

  uniqueId(prefix = 'qa'): string {
    const num = Math.floor(this.nextFloat() * 1000000).toString(16).padStart(6, '0');
    return `${prefix}_${num}`;
  }

  deterministicTimestamp(baseDate = '2026-01-01T00:00:00.000Z', offsetDays = 0): string {
    const d = new Date(baseDate);
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d.toISOString();
  }
}
