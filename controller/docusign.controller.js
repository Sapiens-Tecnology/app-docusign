const docusignService = require("../service/docusign.service");

module.exports = {
  async create(req, res, next) {
    try {
      const args = docusignService.getDocusignArgs(req.body, req.user)
      const results = await docusignService.sendEnvelope(args);
      res.setHeader('Content-Security-Policy', "frame-ancestors * 'self'");
      res.setHeader('X-Frame-Options', 'ALLOWALL');
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
      const docusignUrl = results.redirectUrl; 
      await docusignService.generateHtml(docusignUrl, req.body.clientUserId, results.envelopeId)
      return res.status(201).json({message: "Arquivo criado com sucesso"})
    } catch (error) {
      console.log(error);
      next(error);
    }
  
  },

  async getEnvelopeStatusByEmail(req, res, next) {
    try {
      const { email } = req.params;
      const { name, id } = req.query;
      if (!email|| !name ||!id) {
        return res.status(400).json({ error: 'Os parâmetros name, email e id são obrigatórios.' });
      }
      const response = await docusignService.getStatusByEmail(email, req.user.accessToken, name, id)
      return res.status(200).json(response);
    } catch (error) {
      console.error(error);
      next(error);
    }
  },
  async getEnvelopeStatusByEnvelopeId(req, res, next) {
    try {
      const { envelopeId } = req.params;
      if (!envelopeId) {
        return res.status(400).json({ error: 'O parâmetro envelopeId são obrigatórios.' });
      }
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
      const file = await docusignService.deleteFileFromFtp(id);
      if (!file) return res.status(404).json({message: "Arquivo não encontrado"})
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
      if (!email ||!name ||!id ||!envelopeId) {
        return res.status(400).json({ error: 'Os parâmetros email, name, id e envelopeId são obrigatórios.' });
      }
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
      if (!documentId || !envelopeId) {
        return res.status(400).json({ error: 'Os parâmetros envelopeId e documentId são obrigatórios.' });
      }
      const content = await docusignService.generatePdf(envelopeId, documentId, req.user.accessToken);
      return res.status(200).send(content);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
}