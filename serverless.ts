import type { AWS } from '@serverless/typescript';

import {getGroups, createGroups, getImages, getImage, createImage} from '@lambda/http';
import {sendNotifications, resizeImage} from '@lambda/s3';
import {connect, disconnect} from '@lambda/websocket';
import {elasticSearch} from '@lambda/dynamoDb';


const serverlessConfiguration: AWS = {
  service: 'serverless',
  frameworkVersion: '3',
  useDotenv: true,
  plugins: ['serverless-esbuild', 'serverless-aws-documentation', 'serverless-reqvalidator-plugin'],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      GROUPS_TABLE: 'group-dev',
      IMAGES_TABLE: 'Images-dev',
      IMAGE_ID_iNDEX: 'ImageIdIndex',
      IMAGES_S3_BUCKET: 'serverless-udagram-dev',
      SIGNED_URL_EXPIRATION: '${self:custom.expiration}',
      CONNECTIONS_TABLE: 'Connection-${self:custom.stage}',
      THUMBNAILS_S3_BUCKET: 'serverless-thumbnail-${self:custom.stage}'
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
          Resource: "arn:aws:dynamodb:us-east-1:*:table/group-dev",
        },
        {
          Effect: 'Allow',
          Action: [
            "dynamodb:Query",
            "dynamodb:PutItem",
          ],
          Resource: 'arn:aws:dynamodb:us-east-1:*:table/Images-dev'
        },
        {
          Effect: 'Allow',
          Action: [
            "dynamodb:Query",
          ],
          Resource: 'arn:aws:dynamodb:us-east-1:*:table/Images-dev/index/ImageIdIndex'
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
      ],
      },
    },
  },
  // import the function via paths
  functions: { 
    getGroups, createGroups, getImages, getImage, createImage, 
    sendNotifications,resizeImage,
    connect, disconnect,
    elasticSearch},
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
              IndexName: 'ImageIdIndex',
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
          TableName: 'Images-dev',
        }
      },

      // S3 bucket
      AttachmentBucket: {
        Type: "AWS::S3::Bucket",
        Properties: {
          BucketName: "serverless-udagram-dev",
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
                Resource: 'arn:aws:s3:::serverless-udagram-dev/*'
              }
            ]
          },
          Bucket: {
            "Ref": 'AttachmentBucket'
          }
        }
      },

      // Elastic Search
      ImagesSearch: {
        Type: 'AWS::Elasticsearch::Domain',
        Properties: {
          ElasticsearchVersion: '6.3',
          DomainName: 'images-search-${self:custom.stage}',
          ElasticsearchClusterConfig: {
            DedicatedMasterEnabled: false,
            InstanceCount: 1,
            ZoneAwarenessEnabled: 'false',
            InstanceType: 't2.small.elasticsearch',
          },
          EBSOptions:{
            EBSEnabled: true,
            Iops: 0,
            VolumeSize: 10,
            VolumeType: 'gp2'
          },

          // Elastic Search Access Policy
          // AccessPolicies:{
          // Version: '2012-10-17',
          // Statement:[
          //   {
          //     Effect: 'Allow',
          //     Principal:
          //     {
          //     AWS: '*',
          //     Action: 'es:*',
          //     Resource: '*'
          //     }  
          //   }
          //   ]
          // }
        }
      },

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
                Resource: "ImagesTopic",
                Condition: {
                  ArnLike: {
                    'AWS:SourceArn': "arn:aws:s3:::${self:provider.environment.IMAGES_S3_BUCKET}"
                  }
                }
              }
            ]
          },
          Topics: [
            "ImagesTopic"
          ]
        }
        },

      // Thumbnail Bucket
      ThumbnailsBucket: {
        Type: "AWS::S3::Bucket",
        Properties: {
          BucketName: "${self:provider.environment.THUMBNAILS_S3_BUCKET}",
        }
    }
  }
  }
};

module.exports = serverlessConfiguration;
