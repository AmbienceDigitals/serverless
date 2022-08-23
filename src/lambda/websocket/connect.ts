import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'
import * as AWS  from 'aws-sdk'

const docClient = new AWS.DynamoDB.DocumentClient()

const connectionsTable = process.env.CONNECTIONS_TABLE

export const connect: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Websocket connect', event)

    // get connection Id and timestamp when connection Id was established
    const connectionId = event.requestContext.connectionId
    const timestamp = new Date().toISOString()

    const item = {
        id: connectionId,
        timestamp
    }

    console.log('Storing item: ', item)

    // put connection Id into dynamo Db table
    await docClient.put({
        TableName: connectionsTable,
        Item: item
    }).promise()

    return {
        statusCode: 200,
        body: ''
    }
}
