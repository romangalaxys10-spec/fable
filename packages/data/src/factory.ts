import { SeedGenerator } from './seeds';

export interface UserFixture {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  tier: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface OrderFixture {
  id: string;
  userId: string;
  totalCents: number;
  currency: string;
  status: 'pending' | 'completed' | 'refunded';
  items: { sku: string; qty: number; unitPriceCents: number }[];
}

export class TestDataFactory {
  private rng: SeedGenerator;

  constructor(seed = 42) {
    this.rng = new SeedGenerator(seed);
  }

  createUser(overrides: Partial<UserFixture> = {}): UserFixture {
    const id = this.rng.uniqueId('usr');
    return {
      id,
      email: `${id}@qaforge.internal`,
      role: overrides.role || this.rng.pick(['admin', 'editor', 'viewer']),
      tier: overrides.tier || this.rng.pick(['free', 'pro', 'enterprise']),
      createdAt: this.rng.deterministicTimestamp(),
      ...overrides,
    };
  }

  createOrder(userId: string, overrides: Partial<OrderFixture> = {}): OrderFixture {
    const id = this.rng.uniqueId('ord');
    return {
      id,
      userId,
      totalCents: this.rng.nextInt(1000, 50000),
      currency: 'USD',
      status: overrides.status || 'completed',
      items: [
        { sku: 'PRO-SEAT', qty: 1, unitPriceCents: 2900 }
      ],
      ...overrides,
    };
  }
}
