import { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import 'source-map-support/register';
import * as elasticsearch from 'elasticsearch';
import * as httpAwsEs from 'http-aws-es';

const esHost = process.env.ES_ENDPOINT

const es = new elasticsearch.Client({
    hosts: [ esHost ],
    connectionClass: httpAwsEs
})

export const handler: DynamoDBStreamHandler = async (event: DynamoDBStreamEvent) => {
    console.log('Processing events batch from DynamoDB', JSON.stringify(event))

    // loop through records of events
    for (const record of event.Records) {
        console.log('Processing record', JSON.stringify(record))
        // if record.eventname is not an insert operation, skip the record
        if (record.eventName !== 'INSERT') {
            continue
        }

    const newItem = record.dynamodb.NewImage

    const imageId = newItem.imageId.S

    // format of object to be uploaded to elastic search
    const body = {
        imageId: newItem.imageId.S,
        groupId: newItem.groupId.S,
        imageUrl: newItem.imageUrl.S,
        title: newItem.title.S,
        timestamp: newItem.timestamp.S
    }

    // adding object to elastic search
    await es.index({
        index: 'images-index',
        type: 'images',
        id: imageId,
        body
        })

    }
}
