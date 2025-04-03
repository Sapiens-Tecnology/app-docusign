module.exports = class GeneralError extends Error {
  /**
   * Classe de erro básica derivada da classe Error.
   * @class GeneralError
   * @constructor
   * @param {Object | String} message - Mensagem a ser passada.
   * @param {Number} status - STATUS HTTP do erro.
   */
  constructor (message, status) {
    super ();
    this.message = message;
    this.status = status;
  }
}
