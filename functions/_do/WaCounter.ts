// Durable Object: WaCounter
export class WaCounter {
  state: DurableObjectState;
  ctx: ExecutionContext;

  constructor(state: DurableObjectState, ctx: ExecutionContext) {
    this.state = state;
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    // Get current value (default 0)
    let value = (await this.state.storage.get<number>("counter")) ?? 0;
    // Respond with current value, then increment
    await this.state.storage.put("counter", value + 1);
    return new Response(JSON.stringify({ value }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Required for DO registration
export default {
  fetch: (state: DurableObjectState, env: any, ctx: ExecutionContext) =>
    new WaCounter(state, ctx),
};
