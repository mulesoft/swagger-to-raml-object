"use strict";

var _ = require('lodash');

var parseResourceListing = function(resourceListing, ramlObj) {
  resourceListing = resourceListing || {};
  ramlObj = ramlObj || {};

  var convertInfo = function(info) {
    if (!ramlObj.documentation) {
      ramlObj.documentation = [];
    }
    var titlesNamesMap = {
      'description': 'Description',
      'termsOfServiceUrl': 'Terms of Service URL',
      'contact': 'Contact',
      'license': 'License',
      'licenseUrl': 'License URL'
    };
    ramlObj.title = info.title;
    // RAML has no analogous top-level description, so use "documentation"
    ramlObj.documentation = _(info)
      .pick(['description', 'termsOfServiceUrl', 'contact', 'license', 'licenseUrl'])
      .map(function (value, name) { return {title: titlesNamesMap[name], content:value}; })
      .value();
  };

  var addResourceObjects = function(apis) {
    if (!ramlObj.resources) {
      ramlObj.resources = [];
    }
    _(apis).each(function(api) {
      ramlObj.resources.push({relativeUri: api.path, description: api.description});
    });
  };

  /**
  * Adds implicit grant type information to RAML object
  * Mutates ramlSettings passed in. Destructive!
  * @param {object} input - the implicitGrantTypes object inside the Swagger object
  */
  var addImplicitGrantType = function(input, ramlSettings) {
    if (input && input.loginEndpoint && input.loginEndpoint.url) {
      ramlSettings.authorizationUri = input.loginEndpoint.url;
    }
    if (input.tokenName) {
      ramlSettings.documentation = ramlSettings.documentation || [];
      ramlSettings.documentation.push({implicit_grant_token_name: input.tokenName});
    }
    ramlSettings.authorizationGrants = _.union(ramlSettings.authorizationGrants, ['token']);
  };

  var addAuthorizationCode = function(swaggerAuthCode, ramlSettings) {
    // Mutates ramlSettings passed in.  Destructive!
    var tokenRequestEndpoint = swaggerAuthCode.tokenRequestEndpoint;
    var tokenEndpoint = swaggerAuthCode.tokenEndpoint;
    ramlSettings.authorizationUri = tokenRequestEndpoint.url;
    ramlSettings.accessTokenUri = tokenEndpoint.url;
    // Place optional Swagger fields into settings documentation
    if (tokenRequestEndpoint.clientIdName) {
      ramlSettings.documentation = ramlSettings.documentation || [];
      ramlSettings.documentation.push({
        authcode_client_id_name: 'The API uses "' + tokenRequestEndpoint.clientIdName +
        '" as the paremeter for passing the client id'
      });
    }
    if (tokenRequestEndpoint.clientSecretName) {
      ramlSettings.documentation = ramlSettings.documentation || [];
      ramlSettings.documentation.push({
        authcode_client_secret_name: 'The API uses "' + tokenRequestEndpoint.clientSecretName +
        '" as the parameter for passing the client secret'
      });
    }
    if (tokenEndpoint.tokenName) {
      ramlSettings.documentation = ramlSettings.documentation || [];
      ramlSettings.documentation.push({
        authcode_token_name: 'The API uses "' + tokenEndpoint.tokenName +
        '"as the parameter for passing the authorization token name'
      });
    }
    ramlSettings.authorizationGrants = _.union(ramlSettings.authorizationGrants, ['code'])
  };

  var addAuthorizationObject = function(auth) {
    var obj = {}; // obj to be built and pushed to security schemes
    if (!ramlObj.securitySchemes) {
      ramlObj.securitySchemes = [];
    }
    if (auth.type === 'oauth2') {
      if (!auth.grantTypes) {
        return;  // without grant types, the Oauth2 declaration is not needed
      }
      obj.oauth2 = {
        type: 'OAuth 2.0',
        describedBy: {},
        settings: {}
      };
      obj.oauth2.settings = {
        authorizationUri: {},
        accessTokenUri: {},
        authorizationGrants: [] // can be 'code', 'token', 'owner' or 'credentials'
      };
      if (auth.grantTypes.implicit) {
        addImplicitGrantType(auth.grantTypes.implicit, obj.oauth2.settings);
      }
      if (auth.grantTypes.authorization_code) {
        addAuthorizationCode(auth.grantTypes.authorization_code, obj.oauth2.settings);
      }
      if (auth.scopes) {
        obj.oauth2.settings.scopes = _.pluck(auth.scopes, 'scope');
      }
    } else if (auth.type === 'basicAuth') {
      obj.basic = {
        type: 'Basic Authentication',
        describedBy: {},
        settings: {}
      };
    } else if (auth.type === 'apiKey') {
      var authKeynameMap = {
        header: 'headers',
        query: 'queryParameters'
      };

      obj.apiKey = {
        type: "x-ApiKey",
        describedBy: {}
      }
      if (auth.passAs && authKeynameMap[auth.passAs]) {
        obj.apiKey.describedBy[authKeynameMap[auth.passAs]] = {apiKey: {type: 'string'}};
      }
    }
    ramlObj.securitySchemes.push(obj);
  };

  var addAuthorizationObjects = function(authorizations) {
    _(authorizations).each(addAuthorizationObject);
  };

  // Begin building RAML object
  addResourceObjects(resourceListing.apis);
  addAuthorizationObjects(resourceListing.authorizations);
  if (resourceListing.info) {
    convertInfo(resourceListing.info);
  }
  if (resourceListing.swaggerVersion) {
    ramlObj.documentation = ramlObj.documentation || [];
    ramlObj.documentation.push({
      title: 'swaggerVersion',
      content: resourceListing.swaggerVersion
    });
  }
  if (resourceListing.apiVersion) {
    ramlObj.version = resourceListing.apiVersion
  };
  return ramlObj;
};

exports.convert = parseResourceListing;