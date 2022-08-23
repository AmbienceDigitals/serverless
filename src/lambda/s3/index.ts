import { handlerPath } from '@libs/handler-resolver';

// sendNotification function
export const sendNotifications = {
    handler: `${handlerPath(__dirname)}/sendNotifications.handler`,
    events: [
        {
            sns: {
                arn: {
                    "Fn::Join": [
                        ":",
                        [
                        "arn:aws:sns",
                        {
                            Ref: "AWS::Region"
                        },
                        {
                            Ref: "AWS::AccountId"
                        },
                        "${self:custom.topicName}"
                        ]
                    ]
                },
                topicName: "${self:custom.topicName}"
            }
        }
    ],
    environment: {
        STAGE: '${self:custom.stage}',
        // API_ID:{
        //     Ref: 'websocketApi'
        // }
    }
};

// resize image function
export const resizeImage = {
    handler: `${handlerPath(__dirname)}/resizeImage.handler`,
    events: [
        {
            sns: {
                arn: {
                    "Fn::Join": [
                        ":",
                        [
                        "arn:aws:sns",
                        {
                            Ref: "AWS::Region"
                        },
                        {
                            Ref: "AWS::AccountId"
                        },
                        "${self:custom.topicName}"
                        ]
                    ]
                },
                topicName: "${self:custom.topicName}"
            }
        }
    ],
};