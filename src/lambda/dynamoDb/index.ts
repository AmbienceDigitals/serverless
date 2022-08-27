import { handlerPath } from '@libs/handler-resolver';

// getGroups function
export const elasticSearch = {
    handler: `${handlerPath(__dirname)}/elasticSearch.handler`,
    events: [
        {
        stream: {
            type: 'dynamodb',
            arn: {
                'Fn::GetAtt': ['ImagesDynamoDBTable', 'StreamArn']
            }
        },
        },
    ],
    environment: {
        ES_ENDPOINT: 'ImagesSearch.DomainEndpoint'
    }
    };