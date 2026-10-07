import { UserFixture, OrderFixture } from './factory';
import { SeedGenerator } from './seeds';

export class UserFixtureBuilder {
  private user: UserFixture;

  constructor(seed = 101) {
    const rng = new SeedGenerator(seed);
    const id = rng.uniqueId('usr');
    this.user = {
      id,
      email: `${id}@qaforge.internal`,
      role: 'viewer',
      tier: 'free',
      createdAt: rng.deterministicTimestamp(),
    };
  }

  asAdmin(): this {
    this.user.role = 'admin';
    return this;
  }

  withTier(tier: 'free' | 'pro' | 'enterprise'): this {
    this.user.tier = tier;
    return this;
  }

  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  build(): UserFixture {
    return { ...this.user };
  }
}

export class OrderFixtureBuilder {
  private order: OrderFixture;

  constructor(userId: string, seed = 202) {
    const rng = new SeedGenerator(seed);
    this.order = {
      id: rng.uniqueId('ord'),
      userId,
      totalCents: 5000,
      currency: 'USD',
      status: 'completed',
      items: [{ sku: 'DEFAULT-SKU', qty: 1, unitPriceCents: 5000 }],
    };
  }

  withTotal(cents: number): this {
    this.order.totalCents = cents;
    return this;
  }

  withStatus(status: OrderFixture['status']): this {
    this.order.status = status;
    return this;
  }

  addItem(sku: string, qty: number, unitPriceCents: number): this {
    this.order.items.push({ sku, qty, unitPriceCents });
    this.order.totalCents = this.order.items.reduce((acc, it) => acc + it.qty * it.unitPriceCents, 0);
    return this;
  }

  build(): OrderFixture {
    return { ...this.order };
  }
}
