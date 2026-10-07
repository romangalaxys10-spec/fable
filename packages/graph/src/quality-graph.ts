export interface QualityNode {
  id: string;
  type: 'requirement' | 'feature' | 'code' | 'api' | 'ui' | 'test' | 'execution' | 'evidence' | 'defect';
  title: string;
  metadata?: Record<string, any>;
}

export interface QualityEdge {
  from: string;
  to: string;
  relation: 'implements' | 'exposes' | 'renders' | 'verifies' | 'executed_in' | 'produced' | 'revealed';
}

export class QualityGraph {
  private nodes: Map<string, QualityNode> = new Map();
  private edges: QualityEdge[] = [];

  addNode(node: QualityNode): this {
    this.nodes.set(node.id, node);
    return this;
  }

  addEdge(from: string, to: string, relation: QualityEdge['relation']): this {
    this.edges.push({ from, to, relation });
    return this;
  }

  getNode(id: string): QualityNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): QualityNode[] {
    return Array.from(this.nodes.values());
  }

  getAllEdges(): QualityEdge[] {
    return [...this.edges];
  }

  getTraceability(requirementId: string) {
    const connectedNodes: QualityNode[] = [];
    const queue = [requirementId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = this.nodes.get(current);
      if (node) connectedNodes.push(node);

      const outgoing = this.edges.filter(e => e.from === current).map(e => e.to);
      queue.push(...outgoing);
    }

    return connectedNodes;
  }

  getTestsForFeature(featureId: string): QualityNode[] {
    const testIds = this.edges
      .filter(e => e.relation === 'verifies' && e.to === featureId)
      .map(e => e.from);
    return testIds.map(id => this.nodes.get(id)).filter(Boolean) as QualityNode[];
  }

  exportJson() {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
      summary: {
        totalNodes: this.nodes.size,
        totalEdges: this.edges.length,
        requirementsCount: Array.from(this.nodes.values()).filter(n => n.type === 'requirement').length,
        testsCount: Array.from(this.nodes.values()).filter(n => n.type === 'test').length,
        defectsCount: Array.from(this.nodes.values()).filter(n => n.type === 'defect').length,
      }
    };
  }
}

export function buildStandardQualityGraph(): QualityGraph {
  const g = new QualityGraph();

  // Requirements
  g.addNode({ id: 'REQ-1', type: 'requirement', title: 'Seamless User Checkout', metadata: { tier: 'P0' } });
  g.addNode({ id: 'REQ-2', type: 'requirement', title: 'Strict Role-Based Access Control', metadata: { tier: 'P0' } });

  // Features
  g.addNode({ id: 'FEAT-CHECKOUT', type: 'feature', title: 'Order Payment & Cart State' });
  g.addNode({ id: 'FEAT-AUTH', type: 'feature', title: 'JWT Authentication & Session Guard' });

  // Code & API
  g.addNode({ id: 'CODE-CHECKOUT', type: 'code', title: 'src/services/payment.ts' });
  g.addNode({ id: 'API-ORDERS', type: 'api', title: 'POST /api/orders' });
  g.addNode({ id: 'UI-CHECKOUT', type: 'ui', title: 'src/components/CheckoutModal.tsx' });

  // Tests
  g.addNode({ id: 'TEST-UNIT-PAYMENT', type: 'test', title: 'tests/unit/pricing.test.ts', metadata: { layer: 'unit' } });
  g.addNode({ id: 'TEST-INT-ORDERS', type: 'test', title: 'tests/integration/orders-api.test.ts', metadata: { layer: 'integration' } });
  g.addNode({ id: 'TEST-E2E-CHECKOUT', type: 'test', title: 'tests/e2e/checkout.spec.ts', metadata: { layer: 'e2e' } });

  // Executions & Defect
  g.addNode({ id: 'EXEC-RUN-1', type: 'execution', title: 'CI Build #418', metadata: { durationMs: 1420 } });
  g.addNode({ id: 'DEFECT-1', type: 'defect', title: 'Uncaught 400 Bad Request on Zero Quantity Item', metadata: { severity: 'high' } });

  // Linkages
  g.addEdge('REQ-1', 'FEAT-CHECKOUT', 'implements');
  g.addEdge('FEAT-CHECKOUT', 'CODE-CHECKOUT', 'implements');
  g.addEdge('CODE-CHECKOUT', 'API-ORDERS', 'exposes');
  g.addEdge('CODE-CHECKOUT', 'UI-CHECKOUT', 'renders');
  g.addEdge('TEST-UNIT-PAYMENT', 'FEAT-CHECKOUT', 'verifies');
  g.addEdge('TEST-INT-ORDERS', 'API-ORDERS', 'verifies');
  g.addEdge('TEST-E2E-CHECKOUT', 'UI-CHECKOUT', 'verifies');
  g.addEdge('TEST-INT-ORDERS', 'EXEC-RUN-1', 'executed_in');
  g.addEdge('EXEC-RUN-1', 'DEFECT-1', 'revealed');

  return g;
}
