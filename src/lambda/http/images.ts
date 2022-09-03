import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'
import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'

const XAWS = AWSXRay.captureAWS(AWS)

const docClient = new XAWS.DynamoDB.DocumentClient()

const groupsTable = process.env.GROUPS_TABLE
const imagesTable = process.env.IMAGES_TABLE

// getImages function
export const getImages: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

    console.log('Caller event', event)
    // using path parameter for image id
    const groupId = event.pathParameters.groupId
    const validGroupId = await groupExists(groupId)

    // Error handling for invalidGroupId
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

    const images = await getImagesPerGroup(groupId)

    return {
        statusCode: 201,
        headers: {
        'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            items: images
        })
    }
    }

    // check if group exist
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
    // using !! to convert result to Boolean value
    return !!result.Item
    }

    // return images within a group
    async function getImagesPerGroup(groupId: string) {
    const result = await docClient.query({
        TableName: imagesTable,
        KeyConditionExpression: 'groupId = :groupId',
        ExpressionAttributeValues: {
        ':groupId': groupId,
        },
        // using ScanIndexForward to return latest images first by reversing the sort order
        ScanIndexForward: false
    }).promise();

    return result.Items
}
