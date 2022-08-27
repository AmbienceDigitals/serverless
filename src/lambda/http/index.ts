import { handlerPath } from '@libs/handler-resolver';

// getGroups function
export const getGroups = {
  handler: `${handlerPath(__dirname)}/handler.getGroups`,
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
  handler: `${handlerPath(__dirname)}/handler.createGroups`,
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