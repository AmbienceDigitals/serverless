import { handlerPath } from '@libs/handler-resolver';

// getGroups function
export const elasticSearch = {
    handler: `${handlerPath(__dirname)}/elasticSearch.handler`,
    events: [
        {
        stream: {
            type: 'kinesis',
            arn: {
                'Fn::GetAtt': ['ImagesDynamoDBTable', 'Arn']
                // GetAtt: 'ImagesDynamoDBTable.StreamArn'
            }
        },
        },
    ],
    environment: {
        ES_ENDPOINT: 'ImagesSearch.DomainEndpoint'
    }
    };