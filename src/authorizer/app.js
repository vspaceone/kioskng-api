'use strict';

const { CognitoJwtVerifier } = require('aws-jwt-verify');
const { JwtInvalidClaimError } = require("aws-jwt-verify/error");

const userPoolId = process.env.COGNITO_USER_POOL_ID;
const tokenUse = null;
const clientId = process.env.COGNITO_CLIENT_ID;

const region = process.env.RUNTIME_REGION;

exports.handler = async (request, context, callback) => {

    const arn = request.methodArn;
    let token = request.headers["X-KIOSK-AUTH"];
    if (!token) { 
        token = request.headers["x-kiosk-auth"];
    }

    const verifier = CognitoJwtVerifier.create({
        userPoolId: userPoolId,
        tokenUse: tokenUse,
        clientId: clientId,
        includeRawJwtInErrors: true,
    });

    try {
        const payload = await verifier.verify(token);
        
        console.log("Token is valid. Payload:", payload);

        callback(null, generatePolicyForValidToken(payload, arn));
    } catch (err) {
        console.log(err);
        console.log("Token is invalid. Request:", request);
        if (err instanceof JwtInvalidClaimError) {
            console.log("JWT invalid because:", err.message);
            console.log("Raw JWT:", err.rawJwt.payload);
        }
        console.log("Token not valid!");
        callback("Unauthorized");
    }
};

// Dispatch

function generatePolicyForValidToken(tokenPayload, arn){
    if (tokenPayload['cognito:groups'].includes("admin")){
        return generatePolicyForAdministrator(tokenPayload, arn);
    } else if (tokenPayload['cognito:groups'].includes("point-of-sale")){
        return generatePolicyForPointOfSale(tokenPayload, arn);
    } else if (tokenPayload['cognito:groups'].includes("user")){
        return generatePolicyForUser(tokenPayload, arn);
    }

    return generateDeny(arn);
}

// Specific

function generatePolicyForAdministrator(tokenPayload, arn){
    return generateAllow(arn, tokenPayload["cognito:username"]);
}

function generatePolicyForPointOfSale(tokenPayload, arn){
    return generateDeny(arn, tokenPayload["cognito:username"]);
}

function generatePolicyForUser(tokenPayload, arn){
    return generateDeny(arn, tokenPayload["cognito:username"]);
}

// Generic

function generateAllow(arn, principal, context){
    return generatePolicy(arn, "Allow", principal, context);
}

function generateDeny(arn, principal){
    return generatePolicy(arn, "Deny", principal);
}

function generatePolicy(arn, effect, principal, context){

    if (effect !== "Allow" && effect !== "Deny"){
        effect = "Deny";
    }

    if (!principal){
        principal = "unauthorized";

        if (effect === "Allow"){
            console.log("Request on " + arn + " denied although allow-match because no principalId was found.");
            effect = "Deny";
        }
    }

    return {
        "principalId": principal,
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "execute-api:Invoke",
                    "Effect": effect,
                    "Resource": arn
                }
            ]
        },
        "context": context
    };
}