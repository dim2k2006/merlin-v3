export interface AgentProvider {
  invoke(input: AgentInvokeInput, options?: AgentInvokeOptions): Promise<AgentResponse>;
  buildChatMessage(input: BuildChatMessageInput): ChatMessage;
}

export type AgentInvokeInput = {
  messages: ChatMessage[];
};

export type AgentInvokeOptions = {
  threadId?: string;
};

export type AgentResponse = {
  messages: ChatMessage[];
};

export type ChatMessage = {
  role: Role;
  content: string;
};

type Role = 'developer' | 'user';

export type BuildChatMessageInput = {
  role: Role;
  content: string;
};
