import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'
import * as AWS  from 'aws-sdk'

const docClient = new AWS.DynamoDB.DocumentClient()

const connectionsTable = process.env.CONNECTIONS_TABLE

export const disconnect: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Websocket disconnect', event)

    const connectionId = event.requestContext.connectionId
    const key = {
        id: connectionId
    }

    console.log('Removing item with key: ', key)

    // remove connectionId from dynamo DB table 
    await docClient.delete({
        TableName: connectionsTable,
        Key: key
    }).promise()

    return {
        statusCode: 200,
        body: ''
    }
}
