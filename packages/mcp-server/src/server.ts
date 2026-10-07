import { MCP_TOOLS, MCPToolDefinition } from './tools';

export class QAForgeMCPServer {
  listTools() {
    return Object.values(MCP_TOOLS).map((tool: MCPToolDefinition) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  async callTool(name: string, args: Record<string, any>) {
    const tool = MCP_TOOLS[name];
    if (!tool) {
      throw new Error(`Tool not found: ${name}. Available: ${Object.keys(MCP_TOOLS).join(', ')}`);
    }
    return await tool.handler(args);
  }

  handleJsonRpc(request: { jsonrpc?: string; id?: string | number; method: string; params?: any }) {
    if (request.method === 'tools/list') {
      return { jsonrpc: '2.0', id: request.id, result: { tools: this.listTools() } };
    }
    if (request.method === 'tools/call') {
      const { name, arguments: toolArgs } = request.params || {};
      return this.callTool(name, toolArgs)
        .then(result => ({ jsonrpc: '2.0', id: request.id, result }))
        .catch(err => ({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message: err.message } }));
    }
    return Promise.resolve({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Method not found' } });
  }
}
