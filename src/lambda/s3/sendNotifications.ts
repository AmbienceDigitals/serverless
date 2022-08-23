import { SNSHandler, SNSEvent, S3Event } from 'aws-lambda'
import 'source-map-support/register'
import * as AWS  from 'aws-sdk'

const docClient = new AWS.DynamoDB.DocumentClient()

const connectionsTable = process.env.CONNECTIONS_TABLE
const stage = process.env.STAGE
const apiId = process.env.API_ID

const connectionParams = {
    apiVersion: "2018-11-29",
    endpoint: `${apiId}.execute-api.us-east-1.amazonaws.com/${stage}`
}

const apiGateway = new AWS.ApiGatewayManagementApi(connectionParams)

export const handler: SNSHandler = async (event: SNSEvent) => {
    console.log('Processing SNS event ', JSON.stringify(event))
    // loop through sns record and get s3 event sent to sns 
    for (const snsRecord of event.Records) {
        const s3EventStr = snsRecord.Sns.Message
        console.log('Processing S3 event', s3EventStr)
        const s3Event = JSON.parse(s3EventStr)

        await processS3Event(s3Event)
    }
}

// helper function to process S3 event
async function processS3Event(s3Event: S3Event) {
    for (const record of s3Event.Records) {
        const key = record.s3.object.key
        console.log('Processing S3 item with key: ', key)

        // scan connections dynamodb table to get connection items
        const connections = await docClient.scan({
            TableName: connectionsTable
        }).promise()

        const payload = {
            imageId: key
        }

        for (const connection of connections.Items) {
            const connectionId = connection.id
            await sendMessageToClient(connectionId, payload)
        }
    }
}

// helper function to send message to connection from ApiGateway
async function sendMessageToClient(connectionId, payload) {
    try {
        console.log('Sending message to a connection', connectionId)

        // post message from ApiGateway using connection Id
        await apiGateway.postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify(payload),
        }).promise()

    }
    // error handling when stale connection is detected (http 410 error)
    catch (e) {
        console.log('Failed to send message', JSON.stringify(e))
        if (e.statusCode === 410) {
            console.log('Stale connection')

            await docClient.delete({
                TableName: connectionsTable,
                Key: {
                id: connectionId
                }
        }).promise()

        }
    }
}