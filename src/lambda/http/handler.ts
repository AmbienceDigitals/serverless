import {APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import 'source-map-support/register';
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';
import { getUserId } from '../../auth/utils'

const docClient = new AWS.DynamoDB.DocumentClient()

const groupsTable = process.env.GROUPS_TABLE
export const getGroups: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Processing event: ', event)

    const result = await docClient.scan({
        TableName: groupsTable
    }).promise()

    const items = result.Items

    return {
        statusCode: 200,
        headers: {
        'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
        items
        })
    }
};

export const createGroups: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Processing event: ', event)
    const itemId = uuid.v4();

    const parsedBody = JSON.parse(event.body);
    // return Authorization info from event.headers.Authorization
    const authorization = event.headers.Authorization;
    const split = authorization.split(' ');
    // get jwt token from splitted authorization info
    const jwtToken = split[1];

    const newItem = {
        id: itemId,
        // get userId from jwt token
        userId: getUserId(jwtToken),
        ...parsedBody
    }

    await docClient.put({
        TableName: groupsTable,
        Item: newItem,
    }).promise()

    return {
        statusCode: 201,
        headers: {
        'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
        newItem
        })
    }
};