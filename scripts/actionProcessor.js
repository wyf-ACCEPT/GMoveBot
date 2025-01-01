const { OpenAI } = require('openai')

const GRAY = '\x1b[90m'
const RESET = '\x1b[0m'

/**
 * @typedef {Object} Action
 * @property {string} name - Name of the action
 * @property {string} description - Description of the action
 * @property {string[]} examples - Examples of how to use the action
 * @property {Function} execute - Function to execute the action
 */

/**
 * @typedef {Object} ActionResult
 * @property {boolean} success - Whether the action was successful
 * @property {string} message - Message to be shown to user
 * @property {Object} data - Additional data returned by the action
 */

/**
 * @typedef {Object} ActionContext
 * @property {string} userId - ID of the user who triggered the action
 * @property {string} input - Original user input
 * @property {Object} state - Current conversation state
 * @property {OpenAI} client - OpenAI client instance
 * @property {Array<{role: string, content: string}>} conversationHistory - Conversation history
 */

/**
 * @typedef {Object} BotResponse
 * @property {string} action - Name of the action to execute
 * @property {Object} params - Parameters for the action
 */

/**
 * Creates a new Action
 * @param {Object} config Action configuration
 * @param {string} config.name - Unique identifier for this action
 * @param {string} config.description - Description of what this action does
 * @param {string[]} config.examples - Example conversations showing when to use this action
 * @param {(params: Object, context: ActionContext) => Promise<ActionResult>} config.execute - Function to execute the action with its params
 */
function createAction(config) {
  const {
    name,
    description,
    examples = [],
    execute
  } = config;

  return {
    name,
    description,
    examples,
    execute
  };
}

/**
 * Direct Reply Action
 * @type {Action}
 */
const directReplyAction = createAction({
  name: 'DIRECT_REPLY',
  description: 'Responds to user with natural language',
  examples: [
    `User: What is Movement?\nBot: DIRECT_REPLY; {}`,
    `User: How are you?\nBot: DIRECT_REPLY; {}`,
    `User: Tell me about blockchain\nBot: DIRECT_REPLY; {}`
  ],
  execute: async (params, context) => {
    // For direct reply, we need another call to OpenAI to get the actual response
    const completion = await context.client.chat.completions.create({
      messages: context.conversationHistory,
      model: 'gpt-4'
    });
    const response = completion.choices[0].message.content;
    return {
      success: true,
      message: response,
      data: null,
    };
  }
})

/**
 * Fetch Price Action
 * @type {Action}
 */
const fetchPriceAction = createAction({
  name: 'FETCH_PRICE',
  description: 'Fetches cryptocurrency price data',
  examples: [
    `User: What's BTC price?\nBot: FETCH_PRICE; {"chainId": 1, "pair": "BTC/USDT"}`,
    `User: Show ETH price\nBot: FETCH_PRICE; {"chainId": 1, "pair": "ETH/USDT"}`,
    `User: MOVE token price?\nBot: FETCH_PRICE; {"chainId": 1, "pair": "MOVE/USDT"}`
  ],
  execute: async (params, context) => {
    try {
      const price = await fetchPrice(params.chainId, params.pair);
      return {
        success: true,
        message: `Current price of ${params.pair}: $${price}`,
        data: { price }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fetch price for ${params.pair}`,
        data: null
      };
    }
  }
})

/**
 * Trade Action
 * @type {Action}
 */
const tradeAction = createAction({
  name: 'TRADE',
  description: 'Executes trading operations',
  examples: [
    `User: Buy 5000000 worth of BTC\nBot: TRADE; {"function": "buy", "pair": "BTC/USDT", "amount": 5000000}`,
    `User: Sell my ETH\nBot: TRADE; {"function": "sell", "pair": "ETH/USDT", "amount": -1}`,
    `User: I want to purchase MOVE\nBot: TRADE; {"function": "buy", "pair": "MOVE/USDT", "amount": null}`
  ],
  execute: async (params, context) => {
    try {
      const result = await executeTrade(params);
      return {
        success: true,
        message: `Trade executed successfully: ${params.function} ${params.amount} ${params.pair}`,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to execute trade',
        data: null
      };
    }
  }
})


class ActionProcessor {

  /**
   * @param {OpenAI} openaiClient - OpenAI client instance
   * @param {Action[]} actions - Array of actions to be processed
   * @param {{role: string, content: string}[]} conversationHistory - Array of conversation history
   */
  constructor(openaiClient, actions, conversationHistory) {
    this.openaiClient = openaiClient
    this.actions = actions
    this.conversationHistory = conversationHistory
  }

  async selectAction(userInput) {
    // Call OpenAI to decide which action to take
    this.conversationHistory.push(
      {
        role: 'system',
        content: `Now you are an action selector for GMoveBot. Based on user input, respond with an action and parameters in the format: ACTION; {params}. Available actions:
        ${this.actions.map(a => `${a.name}: ${a.description}\nExamples:\n${a.examples.join('\n')}`).join('\n\n')}`
      },
    )
    const completion = await this.openaiClient.chat.completions.create({
      messages: this.conversationHistory,
      model: 'gpt-4'
    });

    const response = completion.choices[0].message.content;
    this.conversationHistory.push(
      {
        role: 'assistant',
        content: response
      }
    )
    return this.parseResponse(response);
  }

  /**
   * Parses the response from OpenAI into an action and parameters
   * @param {string} response - The response from OpenAI
   * @returns {{action: string, params: Object}} - The action and parameters
   */
  parseResponse(response) {
    // Parse `ACTION, {params}` format into { action, params }
    console.log(response)
    const [action, paramsStr] = response.split(';', 2);
    console.log(action, paramsStr)
    const params = JSON.parse(paramsStr.trim());
    return { action: action.trim(), params };
  }

  /**
   * Processes the selected action
   * @param {BotResponse} botResponse - The selected action and its parameters
   * @param {ActionContext} context - The context for the action
   * @returns {Promise<ActionResult>} - The result of the action
   */
  async processAction(botResponse, context) {
    const action = this.actions.find(a => a.name === botResponse.action);
    if (!action) {
      return {
        success: false,
        message: `Unknown action: ${botResponse.action}`,
        data: null,
      };
    }
    return await action.execute(botResponse.params, context);
  }

  async handleUserInput(userInput, userId = 'default') {
    const context = {
      userId,
      input: userInput,
      state: {},
      client: this.openaiClient,
      conversationHistory: this.conversationHistory,
    };

    // Step 1: Select action based on user input
    const botResponse = await this.selectAction(userInput);
    console.log(`\n\t${GRAY}Selected action: ${botResponse.action}, ` +
      `${JSON.stringify(botResponse.params, null, 2)}${RESET}`)

    // Step 2: Process the selected action
    const result = await this.processAction(botResponse, context);
    this.conversationHistory.push({
      role: 'assistant',
      content: result.message
    })
    console.log(this.conversationHistory)

    return result;
  }
}

module.exports = {
  ActionProcessor,
  directReplyAction,
  fetchPriceAction,
  tradeAction,
};