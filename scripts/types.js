/**
 * @typedef {Object} ActionResult
 * @property {boolean} success - Whether the action was successful
 * @property {string} message - Message to be shown to user
 * @property {any} data - Additional data returned by the action
 */

/**
 * @typedef {Object} ActionContext
 * @property {string} userId - ID of the user who triggered the action
 * @property {string} input - Original user input
 * @property {Object} state - Current conversation state
 */

/**
 * Base class for all bot actions
 */
class BotAction {
  /**
   * @param {ActionContext} context
   * @returns {Promise<ActionResult>}
   */
  async execute(context) {
    throw new Error('Execute method must be implemented');
  }

  /**
   * @returns {string}
   */
  getName() {
    throw new Error('getName method must be implemented');
  }
}

/**
 * Direct reply action - simply responds with text
 */
class DirectReplyAction extends BotAction {
  /**
   * @param {string} response - The text to reply with
   */
  constructor(response) {
    super();
    this.response = response;
  }

  async execute(context) {
    return {
      success: true,
      message: this.response,
      data: null
    };
  }

  getName() {
    return 'DIRECT_REPLY';
  }
}

/**
 * Fetch price action - gets crypto price data
 */
class FetchPriceAction extends BotAction {
  /**
   * @param {string} symbol - The crypto symbol to fetch price for
   */
  constructor(symbol) {
    super();
    this.symbol = symbol;
  }

  async execute(context) {
    try {
      // Implementation would go here
      const price = await this.fetchPrice(this.symbol);
      return {
        success: true,
        message: `Current price of ${this.symbol}: $${price}`,
        data: { price }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fetch price for ${this.symbol}`,
        data: null
      };
    }
  }

  getName() {
    return 'FETCH_PRICE';
  }
}

/**
 * Trade action - executes blockchain transactions
 */
class TradeAction extends BotAction {
  /**
   * @param {Object} tradeParams - Parameters for the trade
   * @param {string} tradeParams.from - From address
   * @param {string} tradeParams.to - To address
   * @param {string} tradeParams.amount - Amount to trade
   */
  constructor(tradeParams) {
    super();
    this.tradeParams = tradeParams;
  }

  async execute(context) {
    try {
      // Implementation would go here
      const txHash = await this.executeTrade(this.tradeParams);
      return {
        success: true,
        message: `Transaction successful! Hash: ${txHash}`,
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

  getName() {
    return 'TRADE';
  }
}

module.exports = {
  BotAction,
  DirectReplyAction,
  FetchPriceAction,
  TradeAction
};
