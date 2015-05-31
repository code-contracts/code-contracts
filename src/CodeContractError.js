/**
 * The error class for code contracts.
 */
export default class CodeContractError extends Error {
  /**
   * @param {string} message - An error message.
   * @param {function} target - A validation target.
   * @param {function} condition - A cause validation.
   */
  constructor(message, target, condition) {
    super(message);

    /**
     * A validation target.
     * @type {function}
     */
    this.target = target;

    /**
     * A cause validation.
     * @type {function}
     */
    this.condition = condition;
  }
}
