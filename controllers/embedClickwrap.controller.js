
 const { embedClickwrap } = require('../embedClickwrap.js');
 const { Router } = require('express');
 const dsConfig = require('../config/index.js').config;
//  const { API_TYPES } = require('../../utils.js');

//  const api = API_TYPES.CLICK;
 const minimumBufferMin = 3;

 const router = Router();


 router.post('/:accountId/:clickwrapId', async (req, res) => {

     const isTokenOK = req.dsAuth.checkToken(minimumBufferMin);
     if (!isTokenOK) {
         req.user = await req.dsAuth.getToken();
         console.log(req.user)
     }

     const { id } = req.body;
     const { accountId, clickwrapId } = req.params;
     
     let results = null;

     const documentArgs = {
        fullName: req.body.fullName,
        email: req.body.email,
        rg: req.body.rg,
        cpf: req.body.cpf,
        date: req.body.date,
        birthDate: req.body.birthDate,
        cellphone: req.body.cellphone,
        street: req.body.street,
        city: req.body.city,
        state: req.body.state,
        neighborhood: req.body.neighborhood,
        zipCode: req.body.zipCode,
        houseNumber: req.body.houseNumber,
        nationality: req.body.nationality,
        civilState: req.body.civilState,
     };

     const args = {
         accessToken: req.user.accessToken,
         basePath: dsConfig.clickAPIUrl,
         accountId: accountId,
         clickwrapId: clickwrapId,
         documentArgs: documentArgs,
         id
     };

     try {
         results = await embedClickwrap(args);
         console.log(JSON.parse(JSON.stringify(results)));
     } catch (error) {
        console.log(error);
        // if (embedClickwrap.agreementUrl == null) {
        //     const errorCode = 'Error:';
        //     const errorMessage = 'The id was already used to agree to this elastic template. Provide a different email address if you want to view the agreement and agree to it.';
        //     // res.render('pages/error', {err: error, errorCode, errorMessage});
        //     console.log(errorCode, errorMessage);

        // } else {
        //     const  errorBody = error && error.response && error.response.body;
        //     const errorCode = errorBody && errorBody.errorCode;
        //     const errorMessage = errorBody && errorBody.message;
        //     console.log(errorCode, errorMessage);

        //     // res.render('pages/error', {err: error, errorCode, errorMessage});
        // }
    }
     if (results) {
    //   const example = getExampleByNumber(res.locals.manifest, exampleNumber, api);
    //   res.render('pages/example_click6_done', {
    //       title: example.ExampleName,
    //       message: example.ResultsPageText,
    //       agreementUrl: JSON.parse(JSON.stringify(results)).agreementUrl
    //   });
  }
 });

 module.exports = router;