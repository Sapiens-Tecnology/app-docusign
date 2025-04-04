require('dotenv/config');
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
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const libre = require("libreoffice-convert");
const GeneralError = require('../classes/GeneralError.class');
const ValidateFields = require('../utils/ValidateFields');
const labelToBodyField = require('../utils/label')
const ftpService = require('./ftp.service')

module.exports = {
  makeFields(templateData) {

    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentYear = currentDate.getFullYear();
  
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const currentMonth = monthNames[currentDate.getMonth()];
  
    const result = {};
  
    result["Day"] = currentDay.toString();
    result["Month"] = currentMonth;
    result["Year"] = currentYear.toString();
  
    for (const [label, bodyField] of Object.entries(labelToBodyField)) {
       
      const value = templateData[bodyField];
  
      if (!value) {
        throw new Error(`A propriedade obrigatória "${bodyField}" está ausente ou inválida.`);
      }
  
      result[label] = value;
    }
  
    return result;
  },
  convertToPdf(inputBuffer) {
    return new Promise((resolve, reject) => {
      libre.convert(inputBuffer, ".pdf", undefined, (err, done) => {
        if (err) {
          reject(new Error("Erro na conversão do LibreOffice: " + err.message));
          return;
        }
        resolve(done);
      });
    });
  },
  
  async extractTextFromDocx(docValues) {
    try {
      const content = fs.readFileSync(path.resolve(demoDocsPath, 'template teste.docx'), 'binary');
      const zip = new PizZip(content);
  
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

    doc.render(docValues);

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });

    const pdfBuffer = await this.convertToPdf(buffer);

    const base64String = pdfBuffer.toString('base64');
  
    return base64String;
  } catch (error) {
    console.error('Erro ao renderizar o documento:', error);
    throw new Error('Erro ao renderizar o documento:')
  }
},
  makeRecipientViewRequest(args) {

    let viewRequest = new docusign.RecipientViewRequest();
    viewRequest.returnUrl = args.dsReturnUrl;
    viewRequest.authenticationMethod = 'none';
  
    viewRequest.email = args.signerEmail;
    viewRequest.userName = args.signerName;
    viewRequest.clientUserId = args.signerClientId;
  
    viewRequest.frameAncestors = ['http://localhost:3000', 'https://apps-d.docusign.com', 'http://localhost:5501', 'http://192.168.1.2:8081', 'http://localhost:8081', 'http://localhost:5502', 'http://localhost:8080', 'http://sandbox.sapiensbank.com.br', "https://sapiensbank.com.br/sandbox", " https://sapiensbank.com.br"];
    viewRequest.messageOrigins = ['https://apps-d.docusign.com'];
  
    return viewRequest;
  },

  async makeEnvelope(args) {
    const { templateData, envelopeArgs } = args;
    const docValues = this.makeFields(templateData)
    let env = new docusign.EnvelopeDefinition();
    env.emailSubject = 'Please sign this document';
    let doc1 = new docusign.Document();
    let doc2 = new docusign.Document();
    let doc1b64 = await this.extractTextFromDocx(docValues);
    let docPdfBytes = fs.readFileSync(envelopeArgs.docFile);
    let doc2b64 = Buffer.from(docPdfBytes).toString('base64');
    doc1.documentBase64 = doc1b64;
    doc1.name = 'Terms of Adhesion';
    doc1.fileExtension = 'docx';
    doc1.documentId = '1';
    doc2.documentBase64 = doc2b64;
    doc2.name = 'Privacy Policy';
    doc2.fileExtension = 'pdf';
    doc2.documentId = '2';
    env.documents = [doc1, doc2];
    env.useDisclosure = true;
    env.status = 'sent';
    let signer1 = docusign.Signer.constructFromObject({
      email: envelopeArgs.signerEmail,
      name: envelopeArgs.signerName,
      clientUserId: envelopeArgs.signerClientId,
      recipientId: envelopeArgs.signerClientId,
    });

    let recipients = docusign.Recipients.constructFromObject({
      signers: [signer1],
    });
    env.recipients = recipients;

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
      "Enterprise Units Written": "enterpriseUnitsWritten",
      "Enterprise Unit With Meter": "enterpriseUnitWithMeters",
      "Enterprise Unit Without Meter": "enterpriseUnitWithoutMeters",
      "Cotization In": "cotizationIn",
      "Cotization In Written": "cotizationInWritten",
      "Contract Value": "contractValue",
      "Enterprise Document": "enterpriseDocument",
      "Bonus Rate": "bonusRate",
      "Bonus Parcels": "bonusParcels",
      "Bonus Value": "bonusValue",
      "User Bank": "userBank",
      "Enterprise State": "enterpriseState",
      "Contract Value Written": "contractValueWritten",
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
  
  async sendEnvelope(args) {
  
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(args.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    let results = null;
 
    let envelope = await this.makeEnvelope(args);
  ///restapi/v2.1/accounts/{accountId}/envelopes
    results = await envelopesApi.createEnvelope(args.accountId, {
      envelopeDefinition: envelope,
    });
  
    let envelopeId = results.envelopeId;
    console.log(`Envelope was created. EnvelopeId ${envelopeId}`);
  
    let viewRequest = this.makeRecipientViewRequest(args.envelopeArgs);
    ///restapi/v2.1/accounts/64b03dd2-202a-4066-a9a0-056dc0ac5776/envelopes/912cd1de-b099-4858-b7aa-2d44f6193875/views/recipient'
    results = await envelopesApi.createRecipientView(args.accountId, envelopeId, {
      recipientViewRequest: viewRequest,
    });
    return { envelopeId: envelopeId, redirectUrl: results.url};
  },

  getDocusignArgs(body, user) {
    const envelopeArgs = {
      signerEmail: body.email,
      signerName: body.fullName,
      signerClientId: body.clientUserId,
      dsReturnUrl: dsReturnUrl,
      docFile: path.resolve(demoDocsPath, pdfFile),
    };
    const templateData = {
      fullName: body.fullName,        
      civilState: body.civilState,
      rg: body.rg,
      cpf: body.cpf,
      birthDate: body.birthDate,
      email: body.email,              
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
      enterpriseUnitsWritten: body.enterpriseUnitsWritten,
      enterpriseUnitWithMeters: body.enterpriseUnitWithMeters,
      enterpriseUnitWithoutMeters: body.enterpriseUnitWithoutMeters,
      cotizationIn: body.cotizationIn,
      cotizationInWritten: body.cotizationInWritten,
      contractValue: body.contractValue,
      enterpriseDocument: body.enterpriseDocument,
      bonusRate: body.bonusRate,
      bonusParcels: body.bonusParcels,
      bonusValue: body.bonusValue,
      userBank: body.userBank,
      enterpriseState: body.enterpriseState,
      contractValueWritten: body.contractValueWritten,
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
  async generateHtml(docusignUrl, id) {
    const templatePath = path.resolve(__dirname, '../', './templates', 'index.html');
    let htmlContent = fs.readFileSync(templatePath, 'utf8');
    
    htmlContent = htmlContent.replace('{{DOCUSIGN_URL}}', docusignUrl);
    htmlContent = htmlContent.replace('{{CLIENT_ID}}', process.env.CLIENT_ID);

    const tempFilePath = path.join(os.tmpdir(), `signing-${id}.html`);
    fs.writeFileSync(tempFilePath, htmlContent);

    const client = await ftpService.createFtpClient();
    await client.uploadFrom(tempFilePath, `/sandbox/6afa10fc-7173-4d6e-82c1-1ec4f709e721/modals-template/docusign/signing-${id}.html`);

    fs.unlinkSync(tempFilePath);
  
    client.close();
  },

  async getStatusByEmail(email, accessToken) {
    if (!email) throw new GeneralError('O parâmetro email é obrigatório.', 400);
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) throw new GeneralError('O e-mail informado é inválido. Certifique-se de que está no formato correto.', 400)
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);

    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    const options = {include: 'recipients', fromDate: '2025-01-01T01:44Z'}; 
    let results = await envelopesApi.listStatusChanges(ACCOUNT_ID, options);
    if (results.envelopes && results.envelopes.length > 0) {
      const matchingEnvelope = results.envelopes.find(
        (envelope) =>
          envelope.recipients?.signers &&
          envelope.recipients.signers[0]?.email === email
      );
      if (matchingEnvelope) {
        const { status, envelopeId } = matchingEnvelope;
        return { status, envelopeId }
      }
    }
    return { status: 'unsend'  }
  },

  async getStatusByEnvelopeId(envelopeId, accessToken) {
    if (!envelopeId) throw new GeneralError('O id do envelope é obrigatório.', 400);
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
    ValidateFields(["email", "name", "id", "envelopeId"], {email, name, id, envelopeId})
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
    await ftpService.deleteFileFromFtp(id)
    await this.generateHtml(results.url + '&locale=pt_BR', id)
  },

  async generatePdf(envelopeId, documentId, accessToken) {
    ValidateFields(["documentId", "envelopeId"], {documentId, envelopeId})
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