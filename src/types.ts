import { OpenAI } from 'openai';

export interface ActionResult {
  success: boolean;
  message: string;
  data: Record<string, any> | null;
}

export interface ActionContext {
  userId: string;
  input: string;
  state: Record<string, any>;
  client: OpenAI;
  conversationHistory: ConversationMessage[];
}

export interface Action {
  name: string;
  description: string;
  examples: string[];
  execute: (params: Record<string, any>, context: ActionContext) => Promise<ActionResult>;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'function' | 'developer';
  content: string;
}

export interface BotResponse {
  action: string;
  params: Record<string, any>;
} 