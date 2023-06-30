// Import AWS SDK and sharp for image processing.
const AWS = require('aws-sdk')
const sharp = require('sharp')

// Initialize an S3 client.
const s3 = new AWS.S3()

// Get environment variables.
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME
const WATERMARK_IMAGE_NAME = process.env.WATERMARK_IMAGE_NAME

// Define common error messages.
const ERROR_MESSAGES = {
    NOT_FOUND: generateErrorResponse(404, 'Not Found'),
    INTERNAL_SERVER_ERROR: generateErrorResponse(500, 'Internal Server Error')
}

// Cache the watermark image across lambda invocations.
let watermarkImageBuffer = null

// The main AWS Lambda handler function.
module.exports.handler = async (event) => {
    try {
        // Get the image key from the event parameters.
        const imageKey = event.pathParameters.image_key

        // Fetch the base image from S3.
        const baseImageBuffer = await fetchImage(S3_BUCKET_NAME, imageKey)

        // If the watermark image isn't cached, fetch it.
        if (!watermarkImageBuffer) {
            watermarkImageBuffer = await fetchImage(S3_BUCKET_NAME, WATERMARK_IMAGE_NAME)
        }

        // Composite the base image and the watermark.
        const outputBuffer = await composeImages(baseImageBuffer, watermarkImageBuffer)

        // Return the composed image as a response.
        return formatResponse(outputBuffer)
    } catch (e) {
        // Log any errors and return an error response.
        console.error(e)
        return handleErrors(e)
    }
}

// Fetches an image from S3 and returns it as a Buffer.
async function fetchImage(bucket, key) {
    const image = await s3.getObject({Bucket: bucket, Key: key}).promise()
    return Buffer.from(image.Body)
}

// Composites two images together using sharp.
async function composeImages(baseImageBuffer, watermarkImageBuffer) {
    const baseImageSharp = sharp(baseImageBuffer)
    const baseImageMetadata = await baseImageSharp.metadata()

    // Resize the watermark to fit inside the base image.
    const watermarkImageSharp = sharp(watermarkImageBuffer).resize({
        width: baseImageMetadata.width,
        height: baseImageMetadata.height,
        fit: sharp.fit.inside,
    })

    // Composite the watermark onto the base image.
    return baseImageSharp.composite([{
        input: await watermarkImageSharp.toBuffer(),
        gravity: sharp.gravity.center
    }]).toBuffer()
}

// Formats the output image into a base64 encoded string.
function formatResponse(outputBuffer) {
    return {
        statusCode: 200,
        body: outputBuffer.toString('base64'),
        headers: {'Content-Type': 'image/png'},
        isBase64Encoded: true
    }
}

// Handles errors by returning appropriate error responses.
function handleErrors(e) {
    if (['AccessDenied', 'NoSuchKey', 'UriParameterError'].includes(e.code)) {
        return ERROR_MESSAGES.NOT_FOUND
    } else {
        return ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    }
}

// Generates an error response with a given status code and message.
function generateErrorResponse(statusCode, message) {
    return {
        statusCode,
        body: message,
        headers: {'Content-Type': 'text/plain'}
    }
}
