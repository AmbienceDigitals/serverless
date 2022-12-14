import { SNSEvent, SNSHandler, S3EventRecord } from 'aws-lambda'
import 'source-map-support/register'
import * as AWS from 'aws-sdk';
import * as Jimp from 'jimp/es';

const s3 = new AWS.S3()

const imagesBucketName = process.env.IMAGES_S3_BUCKET
const thumbnailBucketName = process.env.THUMBNAILS_S3_BUCKET

export const handler: SNSHandler = async (event: SNSEvent) => {
    console.log('Processing SNS event ', JSON.stringify(event))
    // loop through sns record
    for (const snsRecord of event.Records) {
        const s3EventStr = snsRecord.Sns.Message
        console.log('Processing S3 event', s3EventStr)
        const s3Event = JSON.parse(s3EventStr)

        // process every record in s3 bucket
        for (const record of s3Event.Records) {
            await processImage(record)
        }
    }
}

// image processing function
async function processImage(record: S3EventRecord) {
    const key = record.s3.object.key
    console.log('Processing S3 item with key: ', key)
    // get images from images bucket
    const response = await s3
        .getObject({
        Bucket: imagesBucketName,
        Key: key
        }) 
        .promise()

    const body = response.Body
    // resize image 
    const image = await Jimp.read(JSON.stringify(body))

    console.log('Resizing image')
    image.resize(150, Jimp.AUTO)
    const convertedBuffer = await image.getBufferAsync(Jimp.AUTO.toString())

    console.log(`Writing image back to S3 bucket: ${thumbnailBucketName}`)
    await s3
        .putObject({
        Bucket: thumbnailBucketName,
        Key: `${key}.jpeg`,
        Body: convertedBuffer
    })
    .promise()
}
