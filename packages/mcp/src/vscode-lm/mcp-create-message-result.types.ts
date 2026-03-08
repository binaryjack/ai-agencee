export interface MCPCreateMessageResult {
  role: 'assistant';
  content: {
    type: 'text';
    text: string;
  };
  model: string;
  stopReason?: string;
}
