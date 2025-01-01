import { ChatCompletionMessageParam } from 'openai/resources';
import { Action, ActionContext, ActionResult } from './types';

export const directReplyAction: Action = {
  name: 'DIRECT_REPLY',
  description: 'Responds to user with natural language',
  examples: [
    `User: What is Movement?\nBot: DIRECT_REPLY; {}`,
    `User: How are you?\nBot: DIRECT_REPLY; {}`,
    `User: Tell me about blockchain\nBot: DIRECT_REPLY; {}`
  ],
  execute: async (params: Record<string, any>, context: ActionContext): Promise<ActionResult> => {
    const completion = await context.client.chat.completions.create({
      messages: context.conversationHistory as ChatCompletionMessageParam[],
      model: 'gpt-4'
    });

    const response = completion.choices[0].message.content || 'No response generated';
    return {
      success: true,
      message: response,
      data: null
    };
  }
};

export const fetchPriceAction: Action = {
  name: 'FETCH_PRICE',
  description: 'Fetches cryptocurrency price data',
  examples: [
    `User: What's the price of BTC?\nBot: FETCH_PRICE; {"chainId": 1, "pair": "BTC/USDT"}`,
    `User: Show me ETH price\nBot: FETCH_PRICE; {"chainId": 1, "pair": "ETH/USDT"}`,
    `User: How much is MOVE token?\nBot: FETCH_PRICE; {"chainId": 1, "pair": "MOVE/USDT"}`
  ],
  execute: async (params: Record<string, any>): Promise<ActionResult> => {
    try {
      // Mock implementation - replace with actual API call
      const mockPrice = Math.random() * 50000;
      return {
        success: true,
        message: `Current price of ${params.pair}: $${mockPrice.toFixed(2)}`,
        data: { price: mockPrice }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fetch price for ${params.pair}`,
        data: null
      };
    }
  }
};

export const tradeAction: Action = {
  name: 'TRADE',
  description: 'Executes trading operations',
  examples: [
    `User: Buy 5000000 worth of BTC\nBot: TRADE; {"function": "buy", "pair": "BTC/USDT", "amount": 5000000}`,
    `User: Sell my ETH\nBot: TRADE; {"function": "sell", "pair": "ETH/USDT", "amount": -1}`,
    `User: I want to purchase MOVE\nBot: TRADE; {"function": "buy", "pair": "MOVE/USDT", "amount": null}`
  ],
  execute: async (params: Record<string, any>): Promise<ActionResult> => {
    try {
      // Mock implementation - replace with actual trading logic
      const txHash = `0x${Math.random().toString(16).slice(2)}`;
      return {
        success: true,
        message: `Trade executed successfully: ${params.function} ${params.amount} ${params.pair}`,
        data: { txHash }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to execute trade',
        data: null
      };
    }
  }
};
