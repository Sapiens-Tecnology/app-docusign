const docusignService = require("../service/docusign.service");
const ftpService = require('../service/ftp.service')

module.exports = {
  async create(req, res, next) {
    try {;
      const args = docusignService.getDocusignArgs(req.body, req.user)
      const results = await docusignService.sendEnvelope(args);

      return res.status(201).json(results);
    } catch (error) {
      console.log(error);
      next(error);
    }
  
  },

  async createEnvelope(req, res, next) {
    try {
      const args = docusignService.getDocusignArgs(req.body, req.user)
      const results = await docusignService.sendEnvelope(args);
      await docusignService.generateHtml(results.redirectUrl, req.body.clientUserId)
      return res.status(201).json({message: "Arquivo criado com sucesso"})
    } catch (error) {
      console.log(error);
      next(error);
    }
  
  },

  async getEnvelopeStatusByEmail(req, res, next) {
    try {
      const { email } = req.params;
      const response = await docusignService.getStatusByEmail(email, req.user.accessToken)
      return res.status(200).json(response);
    } catch (error) {
      console.error(error);
      next(error);
    }
  },
  async getEnvelopeStatusByEnvelopeId(req, res, next) {
    try {
      const { envelopeId } = req.params;
      const response = await docusignService.getStatusByEnvelopeId(envelopeId, req.user.accessToken)
      return res.status(200).json(response);
    } catch (error) {
      console.error(error);
      next(error);
    }
  },
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await ftpService.deleteFileFromFtp(id);
      return res.sendStatus(204);
    } catch (error) {
      console.error("Erro ao excluir arquivo:", error);
      next(error);
    }
  },

  async recreateContract(req, res, next) {
    try {
      const { envelopeId } = req.params;
      const { email, name, id} = req.body
      await docusignService.recreateContract(email, name, id, envelopeId, req.user.accessToken);
      return res.status(201).json({message: "Arquivo recriado com sucesso"});
    } catch (error) {
      console.error("Erro ao reenviar contrato:", error);
      next(error);
    }
  },

  async getDocumentById(req, res, next) {
    try {
      const { envelopeId, documentId } = req.params;
      const content = await docusignService.generatePdf(envelopeId, documentId, req.user.accessToken);
      return res.status(200).send(content);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
}