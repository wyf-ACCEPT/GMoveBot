import { OpenAI } from 'openai';
import { Action, ActionContext, ActionResult, BotResponse, ConversationMessage } from './types';
import { ChatCompletionMessageParam } from 'openai/resources';

const GRAY = '\x1b[90m';
const RESET = '\x1b[0m';

export class Processor {
  private openaiClient: OpenAI;
  private actions: Action[];
  private conversationHistory: ConversationMessage[];

  constructor(
    openaiClient: OpenAI,
    actions: Action[],
    conversationHistory: ConversationMessage[]
  ) {
    this.openaiClient = openaiClient;
    this.actions = actions;
    this.conversationHistory = conversationHistory;
  }

  async selectAction(userInput: string): Promise<BotResponse> {
    // Call OpenAI to decide which action to take
    this.conversationHistory.push(
      {
        role: 'system',
        content:
          `Now you are an action selector for GMoveBot. Based on user input, respond with an action and ` +
          `parameters in the format: ACTION; {params}. Available actions:\n\n` +
          `${this.actions.map(a => `${a.name}: ${a.description}\nExamples:\n${a.examples.join('\n')}`).join('\n\n')}`
      },
    );

    const completion = await this.openaiClient.chat.completions.create({
      messages: this.conversationHistory as ChatCompletionMessageParam[],
      model: 'gpt-4'
    });

    const response = completion.choices[0].message.content || '';
    this.conversationHistory.push({
      role: 'assistant',
      content: response
    });

    return this.parseResponse(response);
  }

  private parseResponse(response: string): BotResponse {
    const firstCommaIndex = response.indexOf(';');
    if (firstCommaIndex === -1) {
      throw new Error('Invalid response format: no semicolon found');
    }

    const action = response.slice(0, firstCommaIndex).trim();
    let paramsStr = response.slice(firstCommaIndex + 1).trim();

    try {
      const params = JSON.parse(paramsStr);
      return { action, params };
    } catch (error) {
      throw new Error(`Invalid params format: ${paramsStr}`);
    }
  }

  async processAction(botResponse: BotResponse, context: ActionContext): Promise<ActionResult> {
    const action = this.actions.find(a => a.name === botResponse.action);
    if (!action) {
      const errorMessage = `Unknown action: ${botResponse.action}`;
      this.conversationHistory.push({
        role: 'assistant',
        content: errorMessage
      });
      return {
        success: false,
        message: errorMessage,
        data: null
      };
    }

    const result = await action.execute(botResponse.params, {
      ...context,
      client: this.openaiClient,
      conversationHistory: this.conversationHistory
    });

    if (action.name !== 'DIRECT_REPLY') {
      this.conversationHistory.push({
        role: 'assistant',
        content: result.message
      });
    }

    return result;
  }

  async handleUserInput(userInput: string, userId: string = 'default'): Promise<ActionResult> {
    const context: ActionContext = {
      userId,
      input: userInput,
      state: {},
      client: this.openaiClient,
      conversationHistory: this.conversationHistory,
    };

    // Step 1: Select action based on user input
    const botResponse = await this.selectAction(userInput);
    console.log(`\n\t${GRAY}Selected action: ${botResponse.action}, ` +
      `${JSON.stringify(botResponse.params)}${RESET}`);

    // Step 2: Process the selected action
    const result = await this.processAction(botResponse, context);

    return result;
  }
}