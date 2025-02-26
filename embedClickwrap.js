 const docusignClick = require('docusign-click');


  const embedClickwrap = async (args) => {

      const documentArgs = {
      fullName: args.documentArgs.fullName,
      email: args.documentArgs.email,
      date: args.documentArgs.date,
      rg: args.documentArgs.rg,
      cpf: args.documentArgs.cpf,
      birthDate: args.documentArgs.birthDate,
      cellphone: args.documentArgs.cellphone,
      street: args.documentArgs.street,
      city: args.documentArgs.city,
      state: args.documentArgs.state,
      neighborhood: args.documentArgs.neighborhood,
      zipCode: args.documentArgs.zipCode,
      houseNumber: args.documentArgs.houseNumber,
      nationality: args.documentArgs.nationality,
      civilState: args.documentArgs.civilState,
    };
 
   const userAgreement = new docusignClick.UserAgreementRequest.constructFromObject({
     clientUserId: 'rodrigoml2395@gmail.com',
     documentData: {
      fullName: documentArgs.fullName,
      email: documentArgs.email,
      rg: documentArgs.rg,
      cpf: documentArgs.cpf,
      date: documentArgs.date,
      birthDate: documentArgs.birthDate,
      cellphone: documentArgs.cellphone,
      street: documentArgs.street,
      city: documentArgs.city,
      state: documentArgs.state,
      neighborhood: documentArgs.neighborhood,
      zipCode: documentArgs.zipCode,
      houseNumber: documentArgs.house,
      nationality: documentArgs.nationality,
      civilState: documentArgs.civilState,
      },
      returnUrl: 'http://localhost:8080/return',
    //  requireReacceptance: true,
   });
    const dsApiClient = new docusignClick.ApiClient();
    dsApiClient.setBasePath(args.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
    Object.assign(dsApiClient, {
      defaultHeaders: {
        'X-DocuSign-SDK': 'Node',
        Authorization: 'Bearer ' + args.accessToken,
      }
    });
    delete dsApiClient.proxy;
    const accountApi = new docusignClick.AccountsApi(dsApiClient);
    const result = await accountApi.createHasAgreed(
     args.accountId, args.clickwrapId, {
      userAgreementRequest: userAgreement
    });
    console.log(result)

    //ds-snippet-end:Click6Step4
    console.log('See the embedded clickwrap in the dialog box.');
    return result;
  };

module.exports = { embedClickwrap };

