const express = require('express');
const docusignController = require('../controller/docusign.controller');
// const auth = require('../middlewares/auth');

const docusignRouter = express.Router();

// docusignRouter.use(auth);

docusignRouter.post('/docusign/', docusignController.createEnvelope);

docusignRouter.post('/docusign/link', docusignController.create)

docusignRouter.get('/docusign/:email', docusignController.getEnvelopeStatusByEmail);

docusignRouter.get('/docusign/envelope/:envelopeId/document/:documentId', docusignController.getDocumentById)

docusignRouter.delete('/docusign/:id', docusignController.delete);

docusignRouter.put('/docusign/envelope/:envelopeId', docusignController.recreateContract)

module.exports = docusignRouter;