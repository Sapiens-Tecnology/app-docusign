require('dotenv/config');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const dsConfig = require('./config/index').config;
const cors = require('cors');
const DsJwtAuth = require('./DSJwtAuth');
const embedClickwrapController = require('./controllers/embedClickwrap.controller');
const path = require('path');
const fs = require('fs-extra');
const docusign = require('docusign-esign');
const api = 'eSignature';
const signerClientId = 1000; // The id of the signer within this application.
const demoDocsPath = path.resolve(__dirname, './demo_documents');
const pdf1File = 'MINUTA ITAQUERA II.pdf';
const pdf2File = 'privacy.pdf';
const dsReturnUrl = dsConfig.appUrl + '/ds-return';
const dsPingUrl = dsConfig.appUrl + '/'; // Url that will be pinged by the DocuSign signing via Ajax

const app = express();
const TEMPLATE_ID = "e248974c-9c15-42b8-9c83-8157e16b34ba";
const PORT = process.env.PORT || 8080;
const ACCOUNT_ID = process.env.ACCOUNT_ID;
const CLICKWRAP_ID = process.env.CLICKWRAP_ID;
const basePath = 'https://demo.docusign.net/restapi';

app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: '*',
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  req.dsAuth = new DsJwtAuth(req);
  next();
});

app.post('/d', async (req, res) => {

  const isTokenOK = req.dsAuth.checkToken(3);
  if (!isTokenOK) {
      req.user = await req.dsAuth.getToken();
  }

  const envelopeArgs = {
    signerEmail: req.body.signerEmail,
    signerName: req.body.signerName,
    signerClientId: req.body.clientUserId,
    dsReturnUrl: dsReturnUrl,
    docFile: path.resolve(demoDocsPath, pdf1File),
    docFile2: path.resolve(demoDocsPath, pdf2File),
  };
  const templateData = {
    fullName: req.body.signerName,        
    nationality: req.body.nationality,
    civilState: req.body.civilState,
    rg: req.body.rg,
    cpf: req.body.cpf,
    birthDate: req.body.birthDate,
    email: req.body.signerEmail,              
    cellphone: req.body.cellphone,      
    street: req.body.street,            
    houseNumber: req.body.houseNumber,
    neighborhood: req.body.neighborhood,
    city: req.body.city,               
    state: req.body.state,            
    zipCode: req.body.zipCode,          
  };
  

  const args = {
    accessToken: req.user.accessToken,
    basePath: basePath,
    accountId: ACCOUNT_ID,
    envelopeArgs: envelopeArgs,
    templateData,
  };

  let results = null;
  try {
    results = await sendEnvelope(args);
    res.setHeader('Content-Security-Policy', "frame-ancestors * 'self'");
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.json(results);
  } catch (error) {
    console.log(error);
    res.status(error.response?.status || 500).json({ error: error.message, details: error.response?.data });
  }

});

app.post('/d/html', async (req, res) => {

  const isTokenOK = req.dsAuth.checkToken(3);
  if (!isTokenOK) {
      req.user = await req.dsAuth.getToken();
  }

  const envelopeArgs = {
    signerEmail: req.body.signerEmail,
    signerName: req.body.signerName,
    signerClientId: req.body.clientUserId,
    dsReturnUrl: dsReturnUrl,
    docFile: path.resolve(demoDocsPath, pdf1File),
    docFile2: path.resolve(demoDocsPath, pdf2File),
  };
  const templateData = {
    fullName: req.body.signerName,        
    nationality: req.body.nationality,
    civilState: req.body.civilState,
    rg: req.body.rg,
    cpf: req.body.cpf,
    birthDate: req.body.birthDate,
    email: req.body.signerEmail,              
    cellphone: req.body.cellphone,      
    street: req.body.street,            
    houseNumber: req.body.houseNumber,
    neighborhood: req.body.neighborhood,
    city: req.body.city,               
    state: req.body.state,            
    zipCode: req.body.zipCode,          
  };
  

  const args = {
    accessToken: req.user.accessToken,
    basePath: basePath,
    accountId: ACCOUNT_ID,
    envelopeArgs: envelopeArgs,
    templateData,
  };
  let results = null;

  try {
    results = await sendEnvelope(args);
    const docusignUrl = results.redirectUrl;
    const htmlFilePath = path.resolve(__dirname, './', 'index.html');
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    htmlContent = htmlContent.replace('{{DOCUSIGN_URL}}', docusignUrl);
    res.set({'Content-Type': 'text/html'});
    res.setHeader('Content-Security-Policy', "frame-ancestors * 'self'");
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.send(htmlContent);
  } catch (error) {
    console.log(error);
    res.status(error.response?.status || 500).json({ error: error.message, details: error.response?.data });
  }

});


app.get('/d/:email', async (req, res) => {
  try {
    const isTokenOK = req.dsAuth.checkToken(3);
    if (!isTokenOK) {
      req.user = await req.dsAuth.getToken();
      console.log(req.user.accessToken)
    }
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'O email precisa ser informado.' });
    }
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + req.user.accessToken);

    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    const options = {...req.query, include: 'recipients', fromDate: '2025-01-01T01:44Z'}; 
    const results = await envelopesApi.listStatusChanges(ACCOUNT_ID, options);
    if (results.envelopes && results.envelopes.length > 0) {
      const matchingEnvelope = results.envelopes.find(
        (envelope) =>
          envelope.recipients?.certifiedDeliveries &&
          envelope.recipients.certifiedDeliveries[0]?.email === email
      );

      if (matchingEnvelope) {
        const { status, envelopeId } = matchingEnvelope;
        return res.json({ status, envelopeId });
      }
    }
    return res.status(404).json({ message: 'Nenhum envelope foi encontrado.' });
  } catch (error) {
    console.error(error);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'An unexpected error occurred',
    });
  }
});

app.get('/d/envelope/:envelopeId/document/:documentId', async (req, res) => {
  try {
    const isTokenOK = req.dsAuth.checkToken(3);
    if (!isTokenOK) {
      req.user = await req.dsAuth.getToken();
      console.log(req.user.accessToken)
    }
    const { envelopeId, documentId } = req.params;
    if (!documentId || !envelopeId) {
      return res.status(400).json({ error: 'Os parâmetros envelopeId e documentId são obrigatórios.' });
    }

    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + req.user.accessToken);

    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    const results = await envelopesApi.getDocument(ACCOUNT_ID, envelopeId, documentId);

    const base64Data = Buffer.from(results).toString('base64');
    const pdfDataUri = `data:application/pdf;base64,${base64Data}`;
    const htmlFilePath = path.resolve(__dirname, './', 'teste1.html');
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    htmlContent = htmlContent.replace('{{PDF_URL}}', pdfDataUri); 
  //   res.set({'Content-Type': 'text/html'});
  //      res.set({
  //     'Content-Type': 'application/pdf',
  //     'Content-Disposition': 'inline; filename="document.pdf"',
  //     'Content-Length': results.length
  // });
    res.send(htmlContent);
    // return res.status(404).json({ message: 'Nenhum envelope foi encontrado.' });
  } catch (error) {
    console.error(error);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'An unexpected error occurred',
    });
  }
});



const sendEnvelope = async (args) => {

  let dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(args.basePath);
  dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
  let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
  let results = null;

  let envelope = makeEnvelope(args.envelopeArgs, args.templateData);
///restapi/v2.1/accounts/{accountId}/envelopes
  results = await envelopesApi.createEnvelope(args.accountId, {
    envelopeDefinition: envelope,
  });

  let envelopeId = results.envelopeId;
  console.log(`Envelope was created. EnvelopeId ${envelopeId}`);
  const doc = await envelopesApi.getEnvelopeDocGenFormFields(args.accountId, envelopeId);
  const docFields = makeDocFields(doc.docGenFormFields[0].docGenFormFieldList, args.templateData);
  let url =  `https://demo.docusign.net/restapi/v2.1/accounts/${ACCOUNT_ID}/envelopes/${envelopeId}/docGenFormFields`
  const headers = {
    "Authorization": `Bearer ${args.accessToken}`,
    "Content-Type": "application/json",
  };
  let body = {
    "docGenFormFields": [
      {
        "docGenFormFieldList": docFields,
        "documentId": doc.docGenFormFields[0].documentId
      }
    ]
  }
  await axios.put(url, body, { headers });

  url = `https://demo.docusign.net/restapi/v2.1/accounts/${ACCOUNT_ID}/envelopes/${envelopeId}/documents/2`
  body = {
    documentBase64: fs.readFileSync(args.envelopeArgs.docFile2).toString('base64'),
    documentId: "2",
    fileExtension: "pdf",
    name: "Privacy Policy",
    order: 2
  }

  await axios.put(url, body, { headers });

  let viewRequest = makeRecipientViewRequest(args.envelopeArgs);
  ///restapi/v2.1/accounts/64b03dd2-202a-4066-a9a0-056dc0ac5776/envelopes/912cd1de-b099-4858-b7aa-2d44f6193875/views/recipient'
  results = await envelopesApi.createRecipientView(args.accountId, envelopeId, {
    recipientViewRequest: viewRequest,
  });
  return { envelopeId: envelopeId, redirectUrl: results.url + '&locale=pt_BR' };
};

function makeDocFields(docFields, templateData) {
  const labelToBodyField = {
    "Full Name": "fullName",
    "Nationality": "nationality",
    "Civil State": "civilState",
    "RG": "rg",
    "CPF": "cpf",
    "Birth Date": "birthDate",
    "Email": "email",
    "Cellphone": "cellphone",
    "Street": "street",
    "House Number": "houseNumber",
    "Neighborhood": "neighborhood",
    "City": "city",
    "State": "state",
    "Zip Code": "zipCode"
  };

  return docFields.map(field => {
      const bodyField = labelToBodyField[field.label];
      if (bodyField && templateData[bodyField] !== undefined) {
          return {
              ...field,
              value: templateData[bodyField]
          };
      }
      return field;
  });
}



function makeEnvelope(args) {
  let env = new docusign.EnvelopeDefinition();
  env.templateId = TEMPLATE_ID;
  
  const role = new docusign.TemplateRole();
  role.email = args.signerEmail;
  role.name = args.signerName;
  role.roleName = 'Client';
  role.clientUserId = args.signerClientId;

  env.templateRoles = [role];
  env.emailSubject = 'Please sign this document';
  env.useDisclosure = true;
  env.status = 'sent';

  return env;
}

function makeRecipientViewRequest(args) {

  let viewRequest = new docusign.RecipientViewRequest();
  viewRequest.returnUrl = args.dsReturnUrl;
  viewRequest.authenticationMethod = 'none';

  viewRequest.email = args.signerEmail;
  viewRequest.userName = args.signerName;
  viewRequest.clientUserId = args.signerClientId;

  viewRequest.frameAncestors = ['http://localhost:3000', 'https://apps-d.docusign.com', 'http://localhost:5501', 'http://192.168.1.2:8081', 'http://localhost:8081', 'http://localhost:5502'];
  viewRequest.messageOrigins = ['https://apps-d.docusign.com'];

  return viewRequest;
}


app.post('/docusign', async (req, res) => {

  const isTokenOK = req.dsAuth.checkToken(3);
  if (!isTokenOK) {
      req.user = await req.dsAuth.getToken();
      console.log(req.user)
  }


  const url = `https://demo.docusign.net/clickapi/v1/accounts/${ACCOUNT_ID}/clickwraps/${CLICKWRAP_ID}/agreements`;

  const headers = {
      "Authorization": `Bearer ${req.user.accessToken}`,
      "Content-Type": "application/json",
  };
  const {clientUserId, ...documentData} = req.body;
const body = {
  clientUserId: req.body.clientUserId,
  documentData,
  style: {
    agreeButton: {
      // boxShadow: '0 2px 2px 2px rgba(0, 0, 0, .2)',
      height: '50px',
      width: '315px',
      // margin: '10px 0',
      // padding: '3px 0',
      fontSize: '14px',
      fontWeight: 'bold',
      fontFamily: 'Inter',
      color: 'black',
      backgroundColor: '#FFC600',
    },
    // documentLink: {
    //   color: '#757575',
    //   fontSize: '10px',
    //   fontFamily: 'Inter',
    //   // fontWeight: '400',
    // },

  }
}
  try {
      const response = await axios.post(url, body, { headers });
      res.json(response.data);
  } catch (error) {
      res.status(error.response?.status || 500).json({ error: error.message, details: error.response?.data });
  }
});

app.get('/docusign/view', async (req, res) => {

  const isTokenOK = req.dsAuth.checkToken(3);
  if (!isTokenOK) {
      req.user = await req.dsAuth.getToken();
  }

  const headers = {
      "Authorization": `Bearer ${req.user.accessToken}`,
      "Content-Type": "text/html",
  };
  const {clientUserId, ...documentData} = req.body;

const styleEncoded = encodeURIComponent(JSON.stringify({
  agreeButton: {
    height: '50px',
    width: '315px',
    fontSize: '14px',
    fontWeight: 'bold',
    fontFamily: 'Inter',
    color: 'black',
    backgroundColor: '#FFC600',
  },
  // documentLink: {
  //   color: '#757575',
  //   fontSize: '10px',
  //   fontFamily: 'Inter',
  //   // fontWeight: '400',
  // },

}));
const documentDataEncoded = encodeURIComponent(JSON.stringify(documentData));
const url = `https://demo.docusign.net/clickapi/v1/accounts/${ACCOUNT_ID}/clickwraps/${CLICKWRAP_ID}/view?client_user_id=${clientUserId}&document_data=${documentDataEncoded}&host_origin=https%3A%2F%2Fdevelopers.docusign.com&style=${styleEncoded}`;

  try {
      const response = await axios.get(url, { headers });
      res.send(response.data);
  } catch (error) {
      res.status(error.response?.status || 500).json({ error: error.message, details: error.response?.data });
  }
});

app.get('/docusign/user/:clientUserId', async (req, res) => {
  const { clientUserId } = req.params;

  const isTokenOK = req.dsAuth.checkToken(3);
  if (!isTokenOK) {
      req.user = await req.dsAuth.getToken();
  }

  const headers = {
      "Authorization": `Bearer ${req.user.accessToken}`,
      "Content-Type": "application/json",
  };

const url = `https://demo.docusign.net/clickapi/v1/accounts/${ACCOUNT_ID}/clickwraps/${CLICKWRAP_ID}/users`;

  try {
      const response = await axios.get(url, { headers });
      const hasAgreed = response.data.userAgreements.some(user => user.clientUserId === clientUserId);
      res.json({hasAgreed});
  } catch (error) {
      res.status(error.response?.status || 500).json({ error: error.message, details: error.response?.data });
  }
});

app.get('/docusign/agreements/:agreementId', async (req, res) => {
  const { agreementId } = req.params;

  const isTokenOK = req.dsAuth.checkToken(3);
  if (!isTokenOK) {
      req.user = await req.dsAuth.getToken();
  }
//  const dsApiClient = new docusignClick.ApiClient();
//     dsApiClient.setBasePath(dsConfig.clickAPIUrl);
//     dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + req.user.accessToken);
//     const accountApi = new docusignClick.AccountsApi(dsApiClient);
//         const result = await accountApi.getAgreement(
//          accountId, clickwrapId, agreementId);
//          console.log(result)
//          res.send(result);
  const headers = {
      "Authorization": `Bearer ${req.user.accessToken}`,
      "Content-Type": "application/json",
  };

const url = `https://demo.docusign.net/clickapi/v1/accounts/${ACCOUNT_ID}/clickwraps/${CLICKWRAP_ID}/agreements/${agreementId}`;

  try {
      const response = await axios.get(url, { headers });
      res.json(response.data);
  } catch (error) {
      res.status(error.response?.status || 500).json({ error: error.message, details: error.response?.data });
  }
});

app.get('/docusign/agreements/:agreementId/download', async (req, res) => {
  const { agreementId } = req.params;

  const isTokenOK = req.dsAuth.checkToken(3);
  if (!isTokenOK) {
      req.user = await req.dsAuth.getToken();
  }
  // const dsApiClient = new docusignClick.ApiClient();
  //   dsApiClient.setBasePath(dsConfig.clickAPIUrl);
  //   dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + req.user.accessToken);
  //   dsApiClient.addDefaultHeader('Accept', 'application/pdf');
  //   dsApiClient.add
  //   const accountApi = new docusignClick.AccountsApi(dsApiClient);
  //       const result = await accountApi.getAgreementPdf(
  //        accountId, clickwrapId, agreementId);
  //        res.set({
  //                 'Content-Type': 'application/pdf',
  //                 'Content-Disposition': 'inline; filename="document.pdf"',
  //                 'Content-Length': result.length
  //             });
  //        res.send(result);

  const headers = {
      "Authorization": `Bearer ${req.user.accessToken}`,
  };

const url = `https://demo.docusign.net/clickapi/v1/accounts/${ACCOUNT_ID}/clickwraps/${CLICKWRAP_ID}/agreements/${agreementId}/download`;

  try {
      const response = await axios.get(url, { headers, responseType: 'arraybuffer' });
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="document.pdf"',
        'Content-Length': response.data.length
    });
      res.send(response.data);
  } catch (error) {
      res.status(error.response?.status || 500).json({ error: error.message, details: error.response?.data });
  }
});

app.get('/docusign/documents', async (req, res) => {
  const { accountId, clickwrapId } = req.params;

  const isTokenOK = req.dsAuth.checkToken(3);
  if (!isTokenOK) {
      req.user = await req.dsAuth.getToken();
  }

  const headers = {
      "Authorization": `Bearer ${req.user.accessToken}`,
      "Content-Type": "application/json",
  };

  const url = `https://demo.docusign.net/clickapi/v1/accounts/${ACCOUNT_ID}/clickwraps/${CLICKWRAP_ID}/documents`;

  try {
      // Configurar axios para retornar dados binários
      const response = await axios.get(url, { 
          headers,
      });

      // Configurar headers do response
      // res.set({
      //     'Content-Type': 'application/pdf',
      //     'Content-Disposition': 'inline; filename="terms.pdf"',
      //     'Content-Length': response.data.length
      // });

      // Enviar o PDF
      res.send(response.data);
  } catch (error) {
      res.status(error.response?.status || 500).json({ 
          error: error.message, 
          details: error.response?.data 
      });
  }
});



app.use('/test', embedClickwrapController);

// app.use(express.json());





const server = (
  app.listen(PORT, () => {
    console.log(`dev running at ${PORT} 🔥`);
  })
)

module.exports = server;
