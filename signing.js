const path = require('path');
const { sendEnvelope } = require('../examples/focusedView');
const dsConfig = require('../../../config/index.js').config;
const fs = require('fs-extra');
const docusign = require('docusign-esign');
const api = 'eSignature';
const signerClientId = 1000; // The id of the signer within this application.
const demoDocsPath = path.resolve(__dirname, './demo_documents');
const pdf1File = 'MINUTA ITAQUERA II.pdf';
const dsReturnUrl = dsConfig.appUrl + '/ds-return';
const dsPingUrl = dsConfig.appUrl + '/'; // Url that will be pinged by the DocuSign signing via Ajax


app.post('/', async (req, res) => {

  const isTokenOK = req.dsAuth.checkToken(3);
  if (!isTokenOK) {
      req.user = await req.dsAuth.getToken();
  }

  const envelopeArgs = {
    signerEmail: req.body.signerEmail,
    signerName: req.body.signerName,
    signerClientId: signerClientId,
    dsReturnUrl: dsReturnUrl,
    dsPingUrl: dsPingUrl,
    docFile: path.resolve(demoDocsPath, pdf1File),
  };

  const args = {
    accessToken: req.user.accessToken,
    basePath: 'https://demo.docusign.net/restapi',
    accountId: '64b03dd2-202a-4066-a9a0-056dc0ac5776',
    envelopeArgs: envelopeArgs,
  };

  let results = null;

  try {
    results = await sendEnvelope(args);
  } catch (error) {
    const errorBody = error && error.response && error.response.body;
    // we can pull the DocuSign error code and message from the response body
    const errorCode = errorBody && errorBody.errorCode;
    const errorMessage = errorBody && errorBody.message;
    console.log(error);
    res.status(error.response?.status || 500).json({ error: error.message, details: error.response?.data });
    // In production, may want to provide customized error messages and
    // remediation advice to the user.
  }
  // if (results) {
  //   req.session.envelopeId = results.envelopeId; // Save for use by other examples

  //   // Redirect the user to the embedded signing
  //   const example = getExampleByNumber(res.locals.manifest, exampleNumber, api);
  //   return res.render('pages/examples/eg044Embed', {
  //     example: example,
  //     integrationKey: dsConfig.dsClientId,
  //     url: results.redirectUrl,
  //   });
  // }


//   const url = `https://demo.docusign.net/clickapi/v1/accounts/${ACCOUNT_ID}/clickwraps/${CLICKWRAP_ID}/agreements`;

//   const headers = {
//       "Authorization": `Bearer ${req.user.accessToken}`,
//       "Content-Type": "application/json",
//   };
//   const {clientUserId, ...documentData} = req.body;
// const body = {
//   clientUserId: req.body.clientUserId,
//   documentData,
// }
//   try {
//       const response = await axios.post(url, body, { headers });
//       res.json(response.data);
//   } catch (error) {
//       res.status(error.response?.status || 500).json({ error: error.message, details: error.response?.data });
//   }
});



const sendEnvelope = async (args) => {
  // Data for this method
  // args.basePath
  // args.accessToken
  // args.accountId
  console.log(args);

  //ds-snippet-start:eSign44Step3
  let dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(args.basePath);
  dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
  let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
  let results = null;

  // Make the envelope request body
  let envelope = makeEnvelope(args.envelopeArgs);

  // Call Envelopes::create API method
  // Exceptions will be caught by the calling function
  results = await envelopesApi.createEnvelope(args.accountId, {
    envelopeDefinition: envelope,
  });
  //ds-snippet-end:eSign44Step3

  let envelopeId = results.envelopeId;
  console.log(`Envelope was created. EnvelopeId ${envelopeId}`);

  // Create the recipient view, the embedded signing
  //ds-snippet-start:eSign44Step5
  let viewRequest = makeRecipientViewRequest(args.envelopeArgs);
  // Call the CreateRecipientView API
  // Exceptions will be caught by the calling function
  results = await envelopesApi.createRecipientView(args.accountId, envelopeId, {
    recipientViewRequest: viewRequest,
  });

  return { envelopeId: envelopeId, redirectUrl: results.url };
};
//ds-snippet-end:eSign44Step5

/**
 * Creates envelope
 * @function
 * @param {Object} args parameters for the envelope:
 * @returns {Envelope} An envelope definition
 * @private
 */

//ds-snippet-start:eSign44Step2
function makeEnvelope(args) {
  // Data for this method
  // args.signerEmail
  // args.signerName
  // args.signerClientId
  // docFile

  // document 1 (pdf) has tag /sn1/
  //
  // The envelope has one recipients.
  // recipient 1 - signer

  let docPdfBytes;
  // read file from a local directory
  // The read could raise an exception if the file is not available!
  docPdfBytes = fs.readFileSync(args.docFile);

  // create the envelope definition
  let env = new docusign.EnvelopeDefinition();
  env.emailSubject = 'Please sign this document';

  // add the documents
  let doc1 = new docusign.Document();
  let doc1b64 = Buffer.from(docPdfBytes).toString('base64');
  doc1.documentBase64 = doc1b64;
  doc1.name = 'Lorem Ipsum'; // can be different from actual file name
  doc1.fileExtension = 'pdf';
  doc1.documentId = '3';

  // The order in the docs array determines the order in the envelope
  env.documents = [doc1];

  // Create a signer recipient to sign the document, identified by name and email
  // We set the clientUserId to enable embedded signing for the recipient
  // We're setting the parameters via the object creation
  let signer1 = docusign.Signer.constructFromObject({
    email: args.signerEmail,
    name: args.signerName,
    clientUserId: args.signerClientId,
    recipientId: 1,
  });

  // Create signHere fields (also known as tabs) on the documents,
  // We're using anchor (autoPlace) positioning
  //
  // The DocuSign platform seaches throughout your envelope's
  // documents for matching anchor strings.
  // let signHere1 = docusign.SignHere.constructFromObject({
  //   anchorString: '/sn1/',
  //   anchorYOffset: '10',
  //   anchorUnits: 'pixels',
  //   anchorXOffset: '20',
  // });
  // Tabs are set per recipient / signer
  // let signer1Tabs = docusign.Tabs.constructFromObject({
  //   signHereTabs: [signHere1],
  // });
  // signer1.tabs = signer1Tabs;

  // Add the recipient to the envelope object
  let recipients = docusign.Recipients.constructFromObject({
    signers: [signer1],
  });
  env.recipients = recipients;

  // Request that the envelope be sent by setting |status| to "sent".
  // To request that the envelope be created as a draft, set to "created"
  env.status = 'sent';

  return env;
}
//ds-snippet-end:eSign44Step2

//ds-snippet-start:eSign44Step4
function makeRecipientViewRequest(args) {
  // Data for this method
  // args.dsReturnUrl
  // args.signerEmail
  // args.signerName
  // args.signerClientId
  // args.dsPingUrl

  let viewRequest = new docusign.RecipientViewRequest();

  // Set the url where you want the recipient to go once they are done signing
  // should typically be a callback route somewhere in your app.
  // The query parameter is included as an example of how
  // to save/recover state information during the redirect to
  // the DocuSign signing. It's usually better to use
  // the session mechanism of your web framework. Query parameters
  // can be changed/spoofed very easily.
  viewRequest.returnUrl = args.dsReturnUrl + '?state=123';

  // How has your app authenticated the user? In addition to your app's
  // authentication, you can include authenticate steps from DocuSign.
  // Eg, SMS authentication
  viewRequest.authenticationMethod = 'none';

  // Recipient information must match embedded recipient info
  // we used to create the envelope.
  viewRequest.email = args.signerEmail;
  viewRequest.userName = args.signerName;
  viewRequest.clientUserId = args.signerClientId;

  // DocuSign recommends that you redirect to DocuSign for the
  // embedded signing. There are multiple ways to save state.
  // To maintain your application's session, use the pingUrl
  // parameter. It causes the DocuSign signing web page
  // (not the DocuSign server) to send pings via AJAX to your
  // app,
  viewRequest.pingFrequency = 600; // seconds
  // NOTE: The pings will only be sent if the pingUrl is an https address
  viewRequest.pingUrl = args.dsPingUrl; // optional setting
  viewRequest.frameAncestors = ['http://localhost:3000', 'https://apps-d.docusign.com'];
  viewRequest.messageOrigins = ['https://apps-d.docusign.com'];

  return viewRequest;
}
//ds-snippet-end:eSign44Step4

// module.exports = { sendEnvelope, makeEnvelope, makeRecipientViewRequest };
