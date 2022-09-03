import type { AWS } from '@serverless/typescript';

import {getGroups, createGroups, getImages, getImage, createImage} from '@lambda/http';
import {sendNotifications, resizeImage} from '@lambda/s3';
import {connect, disconnect} from '@lambda/websocket';
// import {elasticSearch} from '@lambda/dynamoDb';
import {Auth, Rs256Auth} from '@lambda/auth';


const serverlessConfiguration: AWS = {
  service: 'serverless',
  frameworkVersion: '3',
  useDotenv: true,
  plugins: ['serverless-esbuild', 
  'serverless-aws-documentation', 
  'serverless-reqvalidator-plugin',
  'serverless-plugin-canary-deployments',
  'serverless-iam-roles-per-function',
  'serverless-dynamodb-local',
  'serverless-offline'],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    // X-Ray tracing 
    tracing: {
      lambda: true,
      apiGateway: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      GROUPS_TABLE: 'group-${self:custom.stage}',
      IMAGES_TABLE: 'Images-${self:custom.stage}',
      IMAGE_ID_INDEX: 'ImageIdIndex',
      IMAGES_S3_BUCKET: 'serverless-udagram-${self:custom.stage}',
      SIGNED_URL_EXPIRATION: '${self:custom.expiration}',
      CONNECTIONS_TABLE: 'Connection-${self:custom.stage}',
      THUMBNAILS_S3_BUCKET: 'serverless-thumbnail0075-${self:custom.stage}',
      AUTH_0_SECRET_ID: 'Auth0Secret-${self:custom.stage}',
      AUTH_0_SECRET_FIELD: 'auth0Secret'
    },

    // IAM role definition for access to Dynamo DB
    iam: {
      role: {
        statements: [
          {
          Effect: "Allow",
          Action: [

            "dynamodb:Scan",
            "dynamodb:GetItem",
            "dynamodb:PutItem",
          ],
          Resource: "arn:aws:dynamodb:${self:custom.region}:*:table/${self:provider.environment.GROUPS_TABLE}",
        },
        {
          Effect: 'Allow',
          Action: [
            "dynamodb:Query",
            "dynamodb:PutItem",
          ],
          Resource: 'arn:aws:dynamodb:${self:custom.region}:*:table/${self:provider.environment.IMAGES_TABLE}'
        },
        {
          Effect: 'Allow',
          Action: [
            "dynamodb:Query",
          ],
          Resource: 'arn:aws:dynamodb:${self:custom.region}:*:table/${self:provider.environment.IMAGES_TABLE}/index/${self:provider.environment.IMAGE_ID_INDEX}'
        },
        {
          Effect: 'Allow',
          Action: [
            "s3:PutObject",
            "s3:GetObject"
          ],
          Resource: 'arn:aws:s3:::${self:provider.environment.IMAGES_S3_BUCKET}/*'
        },
        {
          Effect: 'Allow',
          Action: [
            "s3:PutObject",
          ],
          Resource: 'arn:aws:s3:::${self:provider.environment.THUMBNAILS_S3_BUCKET}/*'
        },
        {
          Effect: 'Allow',
          Action: [
            "dynamodb:Scan",
            "dynamodb:PutItem",
            "dynamodb:DeleteItem"
          ],
          Resource: 'arn:aws:dynamodb:${opt:region, self:custom.region}:*:table/${self:provider.environment.CONNECTIONS_TABLE}'
        },
        {
          Effect: 'Allow',
          Action: [
            "secretsmanager:GetSecretValue"
          ],
          Resource: {
            "Ref": "Auth0Secret"
          }
        },
        {
          Effect: 'Allow',
          Action: [
            "kms: Decrypt"
          ],
          Resource: {
            "Fn::GetAtt": ["KMSKey", "Arn"]
          }
        },
        {
          Effect: 'Allow',
          Action: [
            "codedeploy: *"
          ],
          Resource: ["*"]
        }
      ],
      },
    },
  },
  // import the function via paths
  functions: { 
    getGroups, createGroups, getImages, getImage, createImage, 
    sendNotifications,resizeImage,
    connect, disconnect,
    // elasticSearch,
    Auth, Rs256Auth},
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
    stage:'dev',
    region: 'us-east-1',
    expiration: 300,
    topicName:'imagesTopic-${self:custom.stage}',

    // serverless offline plugin setting
    'serverless-offline': {
      port: 3003
    },

    // dynamodb local settings for dynamodb-offline plugin
    dynamodb:{
      stages: ['${self:custom.stage}'],
      start:{
        port: 8000,
        inMemory: true,
        migrate: true,
      }},
    // AWS documentation for API
    documentation: {
      api: {
        // API documentation info
        info: {
          version: 'v1.0.0',
          title: 'Udagram Serverless API',
          description: 'Serverless application for image sharing'
        }
      },

      // model defining database schema
      models: [
      {
        name: 'GroupRequest',
        contentType: 'application/json',
        schema: '${file(models/create-group-request.json)}'
      },
      {
        name: 'ImageRequest',
        contentType: 'application/json',
        schema: '${file(models/create-image-request.json)}'
      }
    ]
    }
  },
  // resource definition 
  resources: {
    Resources: {
      // API Gateway validator for post requests
      RequestBodyValidator: {
        Type: "AWS::ApiGateway::RequestValidator",
        Properties: {
          Name: 'request-body-validator',
          RestApiId: {
            Ref:'ApiGatewayRestApi',
          },
          ValidateRequestBody: true,
          ValidateRequestParameters: false,
        }
      },

      // creating dynamo DB table for image groups
      GroupsDynamoDBTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          AttributeDefinitions: [{
            AttributeName: "id",
            AttributeType: "S",
          }],
          KeySchema: [{
            AttributeName: "id",
            KeyType: "HASH"
          }],
          BillingMode: 'PAY_PER_REQUEST',
          TableName: 'group-dev',
        }
      },

      // creating DynamoDb table for images 
      ImagesDynamoDBTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          AttributeDefinitions: [
          {
            AttributeName: "groupId",
            AttributeType: "S",
          },
          {
            AttributeName: "timestamp",
            AttributeType: "S",
          },
          {
            AttributeName: "imageId",
            AttributeType: "S",
          }
        ],
          KeySchema: [
          {
            AttributeName: "groupId",
            KeyType: "HASH"
          },
          {
            AttributeName: "timestamp",
            KeyType: "RANGE"
          },
        ],
          GlobalSecondaryIndexes: [
            {
              IndexName: '${self:provider.environment.IMAGE_ID_INDEX}',
              KeySchema: [
                {
                  AttributeName: "imageId",
                  KeyType: "HASH"
                },
              ],
              Projection: {
                ProjectionType: "ALL"
              }
            }
          ],
          BillingMode: 'PAY_PER_REQUEST',
          StreamSpecification: {
            StreamViewType: 'NEW_IMAGE'
          },
          TableName: '${self:provider.environment.IMAGES_TABLE}',
        }
      },

      // Websocket connection dynamodb table 
      WebSocketConnectionsDynamoDBTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          AttributeDefinitions: [
            {
              AttributeName: "id",
              AttributeType: "S"
            }
          ],
          KeySchema: [
            {
              AttributeName: "id",
              KeyType: "HASH"
            }
          ],
          BillingMode: "PAY_PER_REQUEST",
          TableName: "${self:provider.environment.CONNECTIONS_TABLE}"
        }
      },

      // S3 bucket
      AttachmentBucket: {
        Type: "AWS::S3::Bucket",
        DependsOn: [
          "SNSTopicPolicy"
        ],
        Properties: {
          BucketName: "${self:provider.environment.IMAGES_S3_BUCKET}",
          NotificationConfiguration:{
            TopicConfigurations: [{
              Event: 's3:ObjectCreated:Put',
              Topic: {
                Ref: 'ImagesTopic'
              }
            }]
          },
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedOrigins: [
                  "*"
                ],
                AllowedHeaders: [
                  "*"
                ],
                AllowedMethods: [
                  "GET",
                  "PUT",
                  "POST",
                  "DELETE",
                  "HEAD"
                ],
                MaxAge: 3000
              }
            ]
          }
        }
      },

      // S3 bucket policy
      BucketPolicy: {
        Type: 'AWS::S3::BucketPolicy',
        Properties: {
          PolicyDocument: {
            Id: 'MyPolicy',
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicReadForGetBucketObjects',
                Effect: 'Allow',
                Principal: '*',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::${self:provider.environment.IMAGES_S3_BUCKET}/*'
              }
            ]
          },
          Bucket: {
            "Ref": 'AttachmentBucket'
          }
        }
      },

      // Elastic Search
      // ImagesSearch: {
      //   Type: 'AWS::Elasticsearch::Domain',
      //   Properties: {
      //     ElasticsearchVersion: '6.3',
      //     DomainName: 'images-search-${self:custom.stage}',
      //     ElasticsearchClusterConfig: {
      //       DedicatedMasterEnabled: false,
      //       InstanceCount: 1,
      //       ZoneAwarenessEnabled: 'false',
      //       InstanceType: 't2.small.elasticsearch',
      //     },
      //     EBSOptions:{
      //       EBSEnabled: true,
      //       Iops: 0,
      //       VolumeSize: 10,
      //       VolumeType: 'gp2'
      //     },

      //     // Elastic Search Access Policy
      //     AccessPolicies:{
      //     Version: '2012-10-17',
      //     Statement:[
      //       {
      //         Effect: 'Allow',
      //         Principal:
      //           {
      //             AWS: '${AWS::AccountId}'
      //           },
      //         Action: 'es:*',
      //         Resource: [
      //           'arn:aws:es:${self:custom.region}:${AWS::AccountId}:domain/images-search-${self:custom.stage}/*'
      //         ]
      //       }
      //       ]
      //     }
      //   }
      // },

      // SNS Topic Resource
      ImagesTopic: {
        Type: 'AWS::SNS::Topic',
        Properties: {
          DisplayName: 'Image bucket topic',
          TopicName: '${self:custom.topicName}'
        }
      },

      // SNS policy
      SNSTopicPolicy: {
        Type: "AWS::SNS::TopicPolicy",
        Properties: {
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: {
                  AWS: "*"
                },
                Action: "sns:Publish",
                Resource: {Ref: "ImagesTopic"},
                Condition: {
                  ArnLike: {
                    "aws:SourceArn": {
                        "Fn::Join": [
                          "",
                          [
                            "arn:aws:s3:::",
                            "${self:provider.environment.IMAGES_S3_BUCKET}"
                          ]
                        ]
                      }
                  }
                }
              }
            ]
          },
          Topics: [
            {Ref: "ImagesTopic"}
          ]
        }
        },

      // Thumbnail Bucket
      ThumbnailsBucket: {
        Type: "AWS::S3::Bucket",
        Properties: {
          BucketName: "${self:provider.environment.THUMBNAILS_S3_BUCKET}",
        }
        },
      
      // API Gateway headers
      GatewayResponseDefault4XX: {
        Type: "AWS::ApiGateway::GatewayResponse",
        Properties: {
          ResponseParameters: {
            "gatewayresponse.header.Access-Control-Allow-Origin": "'*'",
            "gatewayresponse.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            "gatewayresponse.header.Access-Control-Allow-Methods": "'GET,OPTIONS,POST'"
          },
          ResponseType: "DEFAULT_4XX",
          RestApiId: {
            "Ref": "ApiGatewayRestApi"
          }
        }
      },

      // KMS resource
      "KMSKey": {
        "Type": "AWS::KMS::Key",
        "Properties": {
          "Description": "KMS key to encrypt Auth0 secret",
          "KeyPolicy": {
            "Version": "2012-10-17",
            "Id": "key-default-1",
            "Statement": [
              {
                "Sid": "Allow administration of the key",
                "Effect": "Allow",
                "Principal": {
                  "AWS": {
                    "Fn::Join": [
                      ":",
                      [
                        "arn:aws:iam:",
                        {
                          "Ref": "AWS::AccountId"
                        },
                        "root"
                      ]
                    ]
                  }
                },
                "Action": [
                  "kms:*"
                ],
                "Resource": "*"
              }
            ]
          }
        }
      },

      // key alias 
      "KMSKeyAlias": {
        "Type": "AWS::KMS::Alias",
        "Properties": {
          "AliasName": "alias/auth0Key-${self:custom.stage}",
          "TargetKeyId": {"Ref": "KMSKey"}
        }
      },

      // Auth0Secret secret manager resource
      "Auth0Secret": {
        "Type": "AWS::SecretsManager::Secret",
        "Properties": {
          "Name": "${self:provider.environment.AUTH_0_SECRET_ID}",
          "Description": "Auth0 secret",
          "KmsKeyId": {"Ref": "KMSKey"}
        }
      }
  }
  }
};

module.exports = serverlessConfiguration;
