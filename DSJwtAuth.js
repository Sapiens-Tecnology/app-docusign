// dsJwtAuth.js

/**
 * @file
 * This file handles the JWT authentication with DocuSign.
 * It also looks up the user's account and base_url
 * via the OAuth::userInfo method.
 * See https://developers.docusign.com/esign-rest-api/guides/authentication/user-info-endpoints userInfo method.
 * @author DocuSign
 */

'use strict';
class DsJwtAuth {
    constructor(req) {
        // private globals
        this._debug_prefix = 'DsJwtAuth';
        this.accessToken = req.user && req.user.accessToken;
        this.accountId = req.user && req.user.accountId;
        this.accountName = req.user && req.user.accountName;
        this.basePath = req.user && req.user.basePath;
        this._tokenExpiration = req.user && req.user.tokenExpirationTimestamp;
        this.scopes = 'signature dtr.rooms.read dtr.rooms.write dtr.documents.read dtr.documents.write dtr.profile.read dtr.profile.write dtr.company.read dtr.company.write room_forms click.manage click.send organization_read group_read permission_read user_read user_write account_read domain_read identity_provider_read user_data_redact asset_group_account_read asset_group_account_clone_write asset_group_account_clone_read webforms_read webforms_instance_read webforms_instance_write aow_manage organization_sub_account_write organization_sub_account_read';

        // For production use, you'd want to store the refresh token in non-volatile storage since it is
        // good for 30 days. You'd probably want to encrypt it too.
        this._debug = true; // ### DEBUG ### setting

    }
    /**
     * This is the key method for the object.
     * It should be called before any API call to DocuSign.
     * It checks that the existing access accessToken can be used.
     * If the existing accessToken is expired or doesn't exist, then
     * a new accessToken will be obtained from DocuSign by using
     * the JWT flow.
     *
     * This is an async function so call it with await.
     *
     * SIDE EFFECT: Sets the access accessToken that the SDK will use.
     * SIDE EFFECT: If the accountId et al is not set, then this method will
     *              also get the user's information
     * @function
     */
    checkToken(bufferMin = tokenReplaceMinGet) {
        let noToken = !this.accessToken || !this._tokenExpiration;
        let now = moment();
        let needToken = noToken || moment(this._tokenExpiration).subtract(
            bufferMin, 'm').isBefore(now);
        return (!needToken);
    }
    /**
     * Async function to obtain a accessToken via JWT grant
     *
     * RETURNS {accessToken, tokenExpirationTimestamp}
     *
     * We need a new accessToken. We will use the DocuSign SDK's function.
     */
    async getToken() {
        // Data used
        // dsConfig.dsJWTClientId
        // dsConfig.impersonatedUserGuid
        // dsConfig.privateKey
        // dsConfig.dsOauthServer
        const jwtLifeSec = 10 * 60; // requested lifetime for the JWT is 10 min
        const dsApi = new docusign.ApiClient();
        dsApi.setOAuthBasePath(dsConfig.dsOauthServer.replace('https://', '')); // it should be domain only.
        const results = await dsApi.requestJWTUserToken(dsConfig.dsJWTClientId,
            dsConfig.impersonatedUserGuid, this.scopes, rsaKey,
            jwtLifeSec);

        const expiresAt = moment().add(results.body.expires_in, 's').subtract(tokenReplaceMin, 'm');
        this.accessToken = results.body.access_token;
        this._tokenExpiration = expiresAt;
        return {
            accessToken: results.body.access_token,
            tokenExpirationTimestamp: expiresAt
        };
    }
    /**
     * Sets the following variables:
     * DsJwtAuth.accountId
     * DsJwtAuth.accountName
     * DsJwtAuth.basePath
     * DsJwtAuth.userName
     * DsJwtAuth.userEmail
     * @function _getAccount
     * @returns {promise}
     * @promise
     */
    async getUserInfo() {
        // Data used:
        // dsConfig.targetAccountId
        // dsConfig.dsOauthServer
        // DsJwtAuth.accessToken
        const dsApi = new docusign.ApiClient();
        const targetAccountId = dsConfig.targetAccountId;
        const baseUriSuffix = '/restapi';

        dsApi.setOAuthBasePath(dsConfig.dsOauthServer.replace('https://', '')); // it have to be domain name
        const results = await dsApi.getUserInfo(this.accessToken);

        let accountInfo;
        if (!targetAccountId) {
            // find the default account
            accountInfo = results.accounts.find(account => account.isDefault === 'true');
        } else {
            // find the matching account
            accountInfo = results.accounts.find(account => account.accountId === targetAccountId);
        }
        if (typeof accountInfo === 'undefined') {
            throw new Error(`Target account ${targetAccountId} not found!`);
        }

        this.accountId = accountInfo.accountId;
        this.accountName = accountInfo.accountName;
        this.basePath = accountInfo.baseUri + baseUriSuffix;
        return {
            accountId: this.accountId,
            basePath: this.basePath,
            accountName: this.accountName
        };
    }
    /**
     * Clears the accessToken. Same as logging out
     * @function
     */
    clearToken() {
        this._tokenExpiration = false;
        this.accessToken = false;
    }
    /**
     * Store the example number in session storage so it will be
     * used after the user is authenticated
     * @function
     * @param req {object} The request object
     * @param eg {string} The example number that should be started after authentication
     */
    setEg(req, eg) {
        req.session.eg = eg;
        this.eg = eg;
    }
    /**
     * Login user
     * @function
     */
    login(req, res, next) {
        this.internalLogout(req, res);
        req.session.authMethod = 'jwt-auth';
        const log = async () => {
            const auth = await this.getToken();
            const user = await this.getUserInfo();
            return {
                ...auth,
                ...user
            };
        };
        log()
            .then(user => {
                req.login(user, (err) => {
                    if (err) { return next(err); }
                    req.session.authMethod = 'jwt-auth';
                    req.session.accountId = user.accountId;
                    req.session.accountName = user.accountName;
                    req.session.basePath = user.basePath;
                    if (this.eg) {
                        let eg = this.eg;
                        this.eg = null;
                        req.session.eg = null;
                        res.redirect(`/${eg}`);
                    } else {
                        res.redirect('/');
                    }
                });
            })
            .catch(e => {
                let body = e?.response?.body || e?.response?.data;
                // Determine the source of the error
                if (body) {
                    // The user needs to grant consent
                    if (body?.error === 'consent_required') {
                        const consent_scopes = this.scopes + ' impersonation';
                        const consent_url = `${dsConfig.dsOauthServer}/oauth/auth?response_type=code&` +
                            `scope=${consent_scopes}&client_id=${dsConfig.dsJWTClientId}&` +
                            `redirect_uri=${dsConfig.appUrl}/ds/callback`;
                        res.redirect(consent_url);
                    } else {
                        // Consent has been granted. Show status code for DocuSign API error
                        this._debug_log(`\nAPI problem: Status code ${e.response.status}, message body:
                    ${JSON.stringify(body, null, 4)}\n\n`);
                    }
                } else {
                    // Not an API problem
                    throw e;
                }
            });
    }
    /**
     * Clears the object's and session's user information including the tokens.
     * @function
     */
    internalLogout(req, res) {
        this._tokenExpiration = null;
        req.session.accountId = null;
        req.session.accountName = null;
        req.session.basePath = null;
    }
    /**
     * Clears the user information including the tokens.
     * @function
     */
    logoutCallback(req, res) {
        req.logout(function (err) {
            if (err) {
                throw err;
            }
        }); // see http://www.passportjs.org/docs/logout/
        this.internalLogout(req, res);
        req.flash('info', 'You have logged out.');
        res.redirect('/');
    }
    /**
     * Clears the DocuSign authentication session token
     * https://account-d.docusign.com/oauth/logout
     * @function
     */
    logout(req, res) {
        this.logoutCallback(req, res);
    }
    /**
     * If in debug mode, prints message to the console
     * @function
     * @param {string} m The message to be printed
     * @private
     */
    _debug_log(m) {
        if (!this._debug) { return; }
        console.log(this._debug_prefix + ': ' + m);
    }
}
module.exports = DsJwtAuth; // SET EXPORTS for the module.

const moment = require('moment');
const fs = require('fs');
const docusign = require('docusign-esign');
const dsConfig = require('./config/index').config;
const tokenReplaceMin = 10; // The accessToken must expire at least this number of
const tokenReplaceMinGet = 30;
const rsaKey = fs.readFileSync(dsConfig.privateKeyLocation);












