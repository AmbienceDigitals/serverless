import { handlerPath } from '@libs/handler-resolver';

// getGroups function
export const getGroups = {
  handler: `${handlerPath(__dirname)}/getGroups.handler`,
  events: [
    {
      http: {
        method: 'get',
        path: 'groups',
        cors: true
      },
    },
  ],
};

// createGroups function
export const createGroups = {
  handler: `${handlerPath(__dirname)}/createGroups.handler`,
  events: [
    {
      http: {
        method: 'post',
        path: 'groups',
        cors: true,
        authorizer: 'Rs256Auth',
        reqValidatorName: 'RequestBodyValidator',
        documentation: {
          summary: 'Create a new group',
          description: 'creating a new group',
          requestModels: {
            'application/json': 'GroupRequest'
          }
        }
      },
    },
  ],
  deploymentSettings: {
    type: 'Linear10PercentEvery1Minute',
    alias: 'Live'
  }
};

// createGroups function
export const getImages = {
  handler: `${handlerPath(__dirname)}/images.getImages`,
  events: [
    {
      http: {
        method: 'get',
        path: 'groups/{groupId}/images',
        cors: true,
      },
      iam: {
        role: {
          statements: [
            {
              Effect: 'Allow',
              Action:{
                dynamodb:'Query'
              },
              Resource: 'arn:aws:dynamodb:${self:custom.region}:*:table/${self:provider.environment.IMAGES_TABLE}'
            },
            {
              Effect: 'Allow',
              Action:{
                dynamodb:'GetItem'
              },
              Resource: 'arn:aws:dynamodb:${self:custom.region}:*:table/${self:provider.environment.GROUPS_TABLE}'
            },
          ]
        }
      }
    },
  ],
};

// getImage function
export const getImage = {
  handler: `${handlerPath(__dirname)}/getImage.getImage`,
  events: [
    {
      http: {
        method: 'get',
        path: 'images/{imageId}',
        cors: true,
      },
    },
  ],
};

// getImage function
export const createImage = {
  handler: `${handlerPath(__dirname)}/createImage.createImage`,
  events: [
    {
      http: {
        method: 'post',
        path: 'groups/{groupId}/images',
        cors: true,
        authorizer: 'Rs256Auth',
        reqValidatorName: 'RequestBodyValidator',
        documentation: {
          summary: 'Create a new image',
          description: 'creating a new image',
          requestModels: {
            'application/json': 'ImageRequest'
          }
        }
      },
    },
  ],
};