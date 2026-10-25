/**
 * OverBudgetPolicy Interface & Default Implementation (v1)
 *
 * Rules:
 * - v1 always returns 'BLOCK' (reject with 409 INSUFFICIENT_BALANCE).
 * - Later implementations can inspect college settings and return 'ESCALATE'.
 */
export class OverBudgetPolicy {
  /**
   * Decide action when amount exceeds available.
   * @param {number} amount - The requested expense amount
   * @param {number} available - The available budget balance
   * @returns {string} - 'BLOCK' | 'ESCALATE'
   */
  decide(amount, available) { // eslint-disable-line no-unused-vars
    throw new Error('decide must be implemented by concrete OverBudgetPolicy');
  }
}

export class DefaultOverBudgetPolicy extends OverBudgetPolicy {
  decide(amount, available) { // eslint-disable-line no-unused-vars
    return 'BLOCK';
  }
}

export const defaultOverBudgetPolicy = new DefaultOverBudgetPolicy();
