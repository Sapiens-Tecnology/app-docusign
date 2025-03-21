require('dotenv/config');
const ftp = require("basic-ftp");
const axios = require('axios');
const path = require('path');
const dsConfig = require('../config/index').config
const demoDocsPath = path.resolve(__dirname, '../', './demo_documents');
const pdfFile = 'privacy.pdf';
const dsReturnUrl = dsConfig.appUrl + '/ds-return';
const docusign = require('docusign-esign');
const fs = require('fs-extra');
const os = require('os');
const basePath = process.env.BASE_PATH;
const ACCOUNT_ID = process.env.ACCOUNT_ID;
const SERVER_URL = process.env.SERVER_URL;

module.exports = {
  makeRecipientViewRequest(args) {

    let viewRequest = new docusign.RecipientViewRequest();
    viewRequest.returnUrl = args.dsReturnUrl;
    viewRequest.authenticationMethod = 'none';
  
    viewRequest.email = args.signerEmail;
    viewRequest.userName = args.signerName;
    viewRequest.clientUserId = args.signerClientId;
  
    viewRequest.frameAncestors = ['http://localhost:3000', 'https://apps-d.docusign.com', 'http://localhost:5501', 'http://192.168.1.2:8081', 'http://localhost:8081', 'http://localhost:5502', 'http://localhost:8080', 'https://sapiensbank.com.br/'];
    viewRequest.messageOrigins = ['https://apps-d.docusign.com'];
  
    return viewRequest;
  },

  makeEnvelope(args) {
    let env = new docusign.EnvelopeDefinition();
    env.templateId = process.env.TEMPLATE_ID;
    
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
  },

  makeDocFields(docFields, templateData) {
    const labelToBodyField = {
      "Full Name": "fullName",
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
      "Zip Code": "zipCode",
      "Enterprise Name": "enterpriseName",
      "Enterprise Address": "enterpriseAddress",
      "Enterprise Number": "enterpriseNumber",
      "Enterprise Neighborhood": "enterpriseNeighborhood",
      "Enterprise City": "enterpriseCity",
      "Enterprise Meter": "enterpriseMeter",
      "Enterprise Units": "enterpriseUnits",
      "Contract Value": "contractValue",
      "Enterprise Document": "enterpriseDocument",
      "Bonus Rate": "bonusRate",
      "Bonus Parcels": "bonusParcels",
      "Bonus Value": "bonusValue",
      "User Bank": "userBank",
      "Enterprise State": "enterpriseState",
      "Contract Value Written": "contractValueWritten",
      "Capitation Quotas": "capitationQuotas",
      "Capitation Quotas Written": "capitationQuotasWritten",
      "Enterprise Quotas": "enterpriseQuotas",
      "Enterprise Quotas Written": "enterpriseQuotasWritten",
      "Enterprise Bank": "enterpriseBank",
      "Enterprise Bank Account": "enterpriseBankAccount",
      "Bonus Rate Written": "bonusRateWritten",
      "Bonus Parcels Written": "bonusParcelsWritten",
      "Bonus Value Written": "bonusValueWritten",
      "Monthly Profitability": "monthlyProfitability",
      "Monthly Profitability Written": "monthlyProfitabilityWritten",
      "Deadline": "deadline",
      "Deadline Written": "deadlineWritten",
      "Monthly Profitability Value": "monthlyProfitabilityValue",
      "Monthly Profitability Value Written": "monthlyProfitabilityValueWritten",
      "Liquid Total Earnings": "liquidTotalEarnings",
      "Liquid Total Earnings Written": "liquidTotalEarningsWritten"
    };
  
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentYear = currentDate.getFullYear();
    
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const currentMonth = monthNames[currentDate.getMonth()];
  
    return docFields.map(field => {
        if (field.label === "Day") {
          return {
            ...field,
            value: currentDay.toString()
          };
        } else if (field.label === "Month") {
          return {
            ...field,
            value: currentMonth
          };
        } else if (field.label === "Year") {
          return {
            ...field,
            value: currentYear.toString()
          };
        }
        const bodyField = labelToBodyField[field.label];
        if (bodyField && templateData[bodyField] !== undefined) {
            return {
                ...field,
                value: templateData[bodyField]
            };
        }
        return field;
    });
  },

  async createFtpClient() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    await client.access({
      host: "srv654.hstgr.io",
      port: 21,
      user: "u733456228.brenolg",
      password: "2*RfQ$OwdznSs>Od",
      secure: false
    });
    return client;
  },
  
  async sendEnvelope(args) {
  
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(args.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
    console.log(args.accessToken)
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    let results = null;
  
    let envelope = this.makeEnvelope(args.envelopeArgs, args.templateData);
  ///restapi/v2.1/accounts/{accountId}/envelopes
    results = await envelopesApi.createEnvelope(args.accountId, {
      envelopeDefinition: envelope,
    });
  
    let envelopeId = results.envelopeId;
    console.log(`Envelope was created. EnvelopeId ${envelopeId}`);
    const doc = await envelopesApi.getEnvelopeDocGenFormFields(args.accountId, envelopeId);
    const docFields = this.makeDocFields(doc.docGenFormFields[0].docGenFormFieldList, args.templateData);
    let url =  `${args.basePath}/v2.1/accounts/${ACCOUNT_ID}/envelopes/${envelopeId}/docGenFormFields`
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
  
    url = `${args.basePath}/v2.1/accounts/${ACCOUNT_ID}/envelopes/${envelopeId}/documents/2`
    body = {
      documentBase64: fs.readFileSync(args.envelopeArgs.docFile).toString('base64'),
      documentId: "2",
      fileExtension: "pdf",
      name: "Privacy Policy",
      order: 2
    }
  
    await axios.put(url, body, { headers });
  
    let viewRequest = this.makeRecipientViewRequest(args.envelopeArgs);
    ///restapi/v2.1/accounts/64b03dd2-202a-4066-a9a0-056dc0ac5776/envelopes/912cd1de-b099-4858-b7aa-2d44f6193875/views/recipient'
    results = await envelopesApi.createRecipientView(args.accountId, envelopeId, {
      recipientViewRequest: viewRequest,
    });
    return { envelopeId: envelopeId, redirectUrl: results.url + '&locale=pt_BR' };
  },

  getDocusignArgs(body, user) {
    const envelopeArgs = {
      signerEmail: body.signerEmail,
      signerName: body.signerName,
      signerClientId: body.clientUserId,
      dsReturnUrl: dsReturnUrl,
      docFile: path.resolve(demoDocsPath, pdfFile),
    };
    const templateData = {
      fullName: body.signerName,        
      civilState: body.civilState,
      rg: body.rg,
      cpf: body.cpf,
      birthDate: body.birthDate,
      email: body.signerEmail,              
      cellphone: body.cellphone,      
      street: body.street,            
      houseNumber: body.houseNumber,
      neighborhood: body.neighborhood,
      city: body.city,               
      state: body.state,            
      zipCode: body.zipCode,      
      enterpriseName: body.enterpriseName,
      enterpriseAddress: body.enterpriseAddress,
      enterpriseNumber: body.enterpriseNumber,
      enterpriseNeighborhood: body.enterpriseNeighborhood,
      enterpriseCity: body.enterpriseCity,
      enterpriseMeter: body.enterpriseMeter,
      enterpriseUnits: body.enterpriseUnits,
      contractValue: body.contractValue,
      enterpriseDocument: body.enterpriseDocument,
      bonusRate: body.bonusRate,
      bonusParcels: body.bonusParcels,
      bonusValue: body.bonusValue,
      userBank: body.userBank,
      enterpriseState: body.enterpriseState,
      contractValueWritten: body.contractValueWritten,
      capitationQuotas: body.capitationQuotas,
      capitationQuotasWritten: body.capitationQuotasWritten,
      enterpriseQuotas: body.enterpriseQuotas,
      enterpriseQuotasWritten: body.enterpriseQuotasWritten,
      enterpriseBank: body.enterpriseBank,
      enterpriseBankAccount: body.enterpriseBankAccount,
      bonusRateWritten: body.bonusRateWritten,
      bonusParcelsWritten: body.bonusParcelsWritten,
      bonusValueWritten: body.bonusValueWritten,
      monthlyProfitability: body.monthlyProfitability,
      monthlyProfitabilityWritten: body.monthlyProfitabilityWritten,
      deadline: body.deadline,
      deadlineWritten: body.deadlineWritten,
      monthlyProfitabilityValue: body.monthlyProfitabilityValue,
      monthlyProfitabilityValueWritten: body.monthlyProfitabilityValueWritten,
      liquidTotalEarnings: body.liquidTotalEarnings,
      liquidTotalEarningsWritten: body.liquidTotalEarningsWritten
    };
    
  
    return {
      accessToken: user.accessToken,
      basePath: basePath,
      accountId: ACCOUNT_ID,
      envelopeArgs: envelopeArgs,
      templateData,
    };
  },
  async deleteFileFromFtp(id) {
    const client = await this.createFtpClient();
    await client.cd("/sandbox/6afa10fc-7173-4d6e-82c1-1ec4f709e721/modals-template/docusign/");
    
    const fileList = await client.list();
    const fileExists = fileList.some(file => file.name === `signing-${id}.html`);
    if (fileExists) await client.remove(`/sandbox/6afa10fc-7173-4d6e-82c1-1ec4f709e721/modals-template/docusign/signing-${id}.html`);
    client.close();
    return fileExists;
  },
  async generateHtml(docusignUrl, id, envelopeId, accessToken) {
    const templatePath = path.resolve(__dirname, '../', './templates', 'index.html');
    let htmlContent = fs.readFileSync(templatePath, 'utf8');
    
    htmlContent = htmlContent.replace('{{DOCUSIGN_URL}}', docusignUrl);
    htmlContent = htmlContent.replace('{{CLIENT_ID}}', process.env.CLIENT_ID);
    htmlContent = htmlContent.replace('{{API_URL}}', `${SERVER_URL}/${envelopeId}`);

    const tempFilePath = path.join(os.tmpdir(), `signing-${id}.html`);
    fs.writeFileSync(tempFilePath, htmlContent);

    const client = await this.createFtpClient();
    await client.uploadFrom(tempFilePath, `/sandbox/6afa10fc-7173-4d6e-82c1-1ec4f709e721/modals-template/docusign/signing-${id}.html`);

    fs.unlinkSync(tempFilePath);
  
    client.close();
  },

  async getStatusByEmail(email, accessToken, name, id) {
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);

    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    const options = {include: 'recipients', fromDate: '2025-01-01T01:44Z'}; 
    let results = await envelopesApi.listStatusChanges(ACCOUNT_ID, options);
    if (results.envelopes && results.envelopes.length > 0) {
      const matchingEnvelope = results.envelopes.find(
        (envelope) =>
          envelope.recipients?.certifiedDeliveries &&
          envelope.recipients.certifiedDeliveries[0]?.email === email
      );
      if (matchingEnvelope) {
        const { status, envelopeId } = matchingEnvelope;
        return { status, envelopeId }
      }
    }
    return { status: 'unsend'  }
  },

  async getStatusByEnvelopeId(envelopeId, accessToken) {
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);

    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    const options = {envelopeIds: envelopeId}; 
    let results = await envelopesApi.listStatusChanges(ACCOUNT_ID, options);
    if (results.envelopes && results.envelopes.length > 0) {
        const { status } = results.envelopes[0];
        return { status }
    }
  },


  async recreateContract(email, name, id, envelopeId, accessToken) {
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);

    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    let viewRequest = this.makeRecipientViewRequest({
      signerEmail: email,
      signerName: name,
      signerClientId: id,
      dsReturnUrl: dsReturnUrl,
    });
    results = await envelopesApi.createRecipientView(ACCOUNT_ID, envelopeId, {
      recipientViewRequest: viewRequest,
    });
    await this.deleteFileFromFtp(id)
    await this.generateHtml(results.url + '&locale=pt_BR', id, envelopeId, accessToken)
  },

  async generatePdf(envelopeId, documentId, accessToken) {
    const dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);

    const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    const results = await envelopesApi.getDocument(ACCOUNT_ID, envelopeId, documentId);

    const base64Data = Buffer.from(results).toString('base64');
    const pdfDataUri = `data:application/pdf;base64,${base64Data}`;
    const htmlFilePath = path.resolve(__dirname, '../', './templates', 'pdf.html');
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    htmlContent = htmlContent.replace('{{PDF_URL}}', pdfDataUri); 
    return htmlContent;
  }
};