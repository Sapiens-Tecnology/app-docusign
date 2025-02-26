const settings = {};

const dsOauthServer = process.env.production
  ? 'https://account.docusign.com'
  : 'https://account-d.docusign.com';

settings.dsClientSecret = process.env.DS_CLIENT_SECRET;
settings.dsClientId = process.env.DS_CLIENT_ID;
settings.appUrl = process.env.APP_URL;
settings.dsJWTClientId = process.env.DS_JWT_CLIENT_ID;
settings.privateKeyLocation = process.env.PRIVATE_KEY_LOCATION;
settings.impersonatedUserGuid =  process.env.IMPERSONATED_USER_GUID;
settings.clickAPIUrl = process.env.CLICK_API_URL;

exports.config = {
  dsOauthServer,
  ...settings
};
