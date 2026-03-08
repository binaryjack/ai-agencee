export interface MCPSamplingMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text';
    text: string;
  };
}
