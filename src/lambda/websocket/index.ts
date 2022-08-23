import { handlerPath } from '@libs/handler-resolver';

// getGroups function
export const connect = {
    handler: `${handlerPath(__dirname)}/connect.connect`,
    events: [
        {
        websocket: {
            route: '$connect'
        },
        },
    ],
};

export const disconnect = {
    handler: `${handlerPath(__dirname)}/disconnect.disconnect`,
    events: [
        {
        websocket: {
            route: '$disconnect'
        },
        },
    ],
};