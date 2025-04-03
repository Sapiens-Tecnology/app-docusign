const GeneralError = require('../classes/GeneralError.class')

module.exports = (fields, data) => {
  const missingFields = fields.filter((field) => !data[field]);
  if (missingFields.length === 1) {
    throw new GeneralError(`O seguinte campo é obrigatório: ${missingFields[0]}`, 400);
  }
  if (missingFields.length > 0) {
    throw new GeneralError(`Os seguintes campos são obrigatórios: ${missingFields.join(", ")}`, 400);
  }
}