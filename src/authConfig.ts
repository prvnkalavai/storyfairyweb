import * as msal from '@azure/msal-browser';

// Configuration constants
const clientId = process.env.REACT_APP_B2C_CLIENT_ID;
const tenantName = process.env.REACT_APP_B2C_TENANT;
const tenantId = process.env.REACT_APP_B2C_TENANT_ID;
const userFlow = process.env.REACT_APP_B2C_USER_FLOW;

// Validate required environment variables
const requiredEnvVars = {
    'REACT_APP_B2C_CLIENT_ID': clientId,
    'REACT_APP_B2C_TENANT': tenantName,
    'REACT_APP_B2C_TENANT_ID': tenantId,
    'REACT_APP_B2C_USER_FLOW': userFlow
};

Object.entries(requiredEnvVars).forEach(([name, value]) => {
    if (!value) {
        throw new Error(`Environment variable ${name} must be set.`);
    }
});

// API Configuration
export const apiConfig = {
    scopes: [
        'https://storyfairy.onmicrosoft.com/api/user_impersonation', 
        'offline_access',
        'openid'
    ]
};

// MSAL Configuration
export const msalConfig: msal.Configuration = {
    auth: {
        clientId: clientId!,
        authority: `https://${tenantName}.b2clogin.com/tfp/${tenantId}/${userFlow}`,
        knownAuthorities: [`${tenantName}.b2clogin.com`],
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
        navigateToLoginRequestUrl: true
    },
    cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false // Set to true only for IE11
    },
    system: {
        allowNativeBroker: false,
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (!containsPii) console.log(message);
            },
            logLevel: msal.LogLevel.Verbose,
            piiLoggingEnabled: false
        }
    }
};

// Login request
export const loginRequest = {
    scopes: [...apiConfig.scopes]
};

// Token request
export const tokenRequest = {
    scopes: [...apiConfig.scopes]
};

// Create and export MSAL instance
export const msalInstance = new msal.PublicClientApplication(msalConfig);

// Pre-load and cache token silently
msalInstance.initialize().then(() => {
    // Handle the response from auth redirects
    msalInstance.handleRedirectPromise().catch(error => {
        console.error("Error handling redirect:", error);
    });
});

export default msalInstance;