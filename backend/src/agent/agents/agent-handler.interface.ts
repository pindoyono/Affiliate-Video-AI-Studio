/**
 * Shared interface for all AI agent handlers.
 * Each handler receives the task's input JSON and returns output JSON.
 */
export interface AgentHandler {
  execute(input: Record<string, any>): Promise<Record<string, any>>;
}
