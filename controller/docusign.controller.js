const docusignService = require("../service/docusign.service");

module.exports = {
  async create(req, res, next) {
  
    const isTokenOK = req.dsAuth.checkToken(3);
    if (!isTokenOK) {
        req.user = await req.dsAuth.getToken();
    }
    try {
      const args = docusignService.getDocusignArgs(req.body, req.user)
      const results = await docusignService.sendEnvelope(args);
      res.setHeader('Content-Security-Policy', "frame-ancestors * 'self'");
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.json(results);
    } catch (error) {
      console.log(error);
      next(error);
    }
  
  },

  async createEnvelope(req, res, next) {
  
    const isTokenOK = req.dsAuth.checkToken(3);
    if (!isTokenOK) {
        req.user = await req.dsAuth.getToken();
    }
    try {
      const args = docusignService.getDocusignArgs(req.body, req.user)
      const results = await docusignService.sendEnvelope(args);
      const docusignUrl = results.redirectUrl; 
      await docusignService.generateHtml(docusignUrl, req.body.clientUserId)
      res.status(201).json({message: "Arquivo criado com sucesso"})
    } catch (error) {
      console.log(error);
      next(error);
    }
  
  },

  async getEnvelopeStatusByEmail(req, res, next) {
    try {
      const isTokenOK = req.dsAuth.checkToken(3);
      if (!isTokenOK) {
        req.user = await req.dsAuth.getToken();
      }
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
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const file = await docusignService.deleteFileFromFtp(id);
      if (!file) return res.status(404).json({message: "Arquivo não encontrado"})
      res.sendStatus(204);
    } catch (error) {
      console.error("Erro ao excluir arquivo:", error);
      next(error);
    }
  },

  async getDocumentById(req, res, next) {
    try {
      const isTokenOK = req.dsAuth.checkToken(3);
      if (!isTokenOK) {
        req.user = await req.dsAuth.getToken();
      }
      const { envelopeId, documentId } = req.params;
      if (!documentId || !envelopeId) {
        return res.status(400).json({ error: 'Os parâmetros envelopeId e documentId são obrigatórios.' });
      }
      const content = await docusignService.generatePdf(envelopeId, documentId, req.user.accessToken);
      res.status(200).send(content);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
}