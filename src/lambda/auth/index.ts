import { handlerPath } from '@libs/handler-resolver';

// Auth function
export const Auth = {
    handler: `${handlerPath(__dirname)}/authOAuthorizer.handler`,
};

// 
export const Rs256Auth = {
    handler: `${handlerPath(__dirname)}/rs256Auth0Authorizer.handler`,
};