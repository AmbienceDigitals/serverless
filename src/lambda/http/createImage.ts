import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'
import * as AWS  from 'aws-sdk'
import * as uuid from 'uuid'
import middy from '@middy/core';
import cors from '@middy/http-cors';

const docClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3({
    signatureVersion: 'v4'
});

const groupsTable = process.env.GROUPS_TABLE;
const imagesTable = process.env.IMAGES_TABLE;
const bucketName = process.env.IMAGES_S3_BUCKET;
const urlExpiration = process.env.SIGNED_URL_EXPIRATION;

// create Single Image Function 
export const createImage = middy( async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Caller event', event)
    const groupId = event.pathParameters.groupId
    const validGroupId = await groupExists(groupId)
    
        if (!validGroupId) {
        return {
            statusCode: 404,
            headers: {
            'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
            error: 'Group does not exist'
            })
        }
        }
    
        // TODO: Create an image
        const imageId = uuid.v4();
        const newItem = await createImageById(groupId, imageId, event)
        const url = getUploadUrl(imageId) 

        return {
        statusCode: 201,
        body: JSON.stringify({
            newItem: newItem, 
            // signedUrl for image 
            uploadUrl: url
        })
        }
    })
    
    // helper function to check if group exists
    async function groupExists(groupId: string) {
        const result = await docClient
        .get({
            TableName: groupsTable,
            Key: {
            id: groupId
            }
        })
        .promise()
    
        console.log('Get group: ', result)
        return !!result.Item
};

// helper function to create Image
async function createImageById(groupId: string, imageId: string, event: any) {
    const timestamp = new Date().toISOString();
    const newImage = JSON.parse(event.body)
    const imageUrl = `https://${bucketName}.s3.amazonaws.com/${imageId}`;

    const newItem = {
        groupId,
        timestamp,
        imageId,
        ...newImage,
        // signed url to create image to
        imageUrl
    }
    console.log('storing new item ', newItem)

    await docClient.put({
        TableName: imagesTable,
        Item: newItem
    }).promise()

    return newItem
    };

    // helper function to get signedURL to upload image
    function getUploadUrl(imageId: string) {
        return s3.getSignedUrl('putObject', {
            Bucket: bucketName,
            Key: imageId,
            Expires: parseInt(urlExpiration)
        })
    }

    // using middy CORS middleware 
    createImage.use(
        cors({
            credentials:true,
        })
    )