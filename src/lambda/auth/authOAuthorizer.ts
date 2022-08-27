import { CustomAuthorizerEvent, CustomAuthorizerResult } from 'aws-lambda'
import 'source-map-support/register';

import middy from '@middy/core';
import secretsManager from '@middy/secrets-manager';

import { verify } from 'jsonwebtoken';
import { JwtToken } from '../../auth/JwtToken';


const secretId = process.env.AUTH_0_SECRET_ID
const secretField = process.env.AUTH_0_SECRET_FIELD

// custom Authorization handler
export const handler = middy(async (event: CustomAuthorizerEvent, context): Promise<CustomAuthorizerResult> => {
    try {
        const decodedToken = verifyToken(
            event.authorizationToken,
            context.AUTH0_SECRET[secretField]);
        console.log('User was authorized', decodedToken)

        return {
            // API gateway policy
            principalId: decodedToken.sub,
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    // Action to invoke lambda function on API
                    {
                        Action: 'execute-api:Invoke',
                        Effect: 'Allow',
                        Resource: '*'
                    }
                ]
            }
        }
    } catch (e) {
        console.log('User was not authorized', e.message)

        return {
            // deny user 
            principalId: 'user',
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action:'execute-api:Invoke',
                        Effect: 'Deny',
                        Resource: '*'
                    }
                ]
            }
        }
    }
})


// function to verify token
function verifyToken(authHeader: string, secret: string): JwtToken {
    // if authHeader is missing, return error
    if (!authHeader)
        throw new Error('No authentication header')

    if (!authHeader.toLocaleLowerCase('bearer'))
        throw new Error('Invalid authorization header')

    const split = authHeader.split(' ');
    const token = split[1];


    // check if returned value complies with JwtToken type
    return verify(token, secret) as JwtToken
};

// using middy middleware to get secret from secret manager
handler.use(
    secretsManager({
        cache: true,
        cacheExpiry: 60000,
        throwOnFailedCall: true,
        secrets: {
            AUTH0_SECRET: secretId
        }
    })
)