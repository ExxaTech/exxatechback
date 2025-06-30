import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";
import { v4 as uuid } from "uuid";
import { WhatRepository, WhatRequestMessage, WhatsWeboHookTypes } from "/opt/nodejs/whatsLayer";


AWSXRay.captureAWS(require("aws-sdk"))
const whatsDdb = process.env.WHATS_DDB!
const ddbClient = new DynamoDB.DocumentClient()
const whatRepository = new WhatRepository(ddbClient, whatsDdb)

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {

  const lambdaRequestId = context.awsRequestId
  const apiRequestId = event.requestContext.requestId

  console.log(`API Gateway RequestID: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`)
  const method = event.httpMethod

  if (method === 'POST') {
    console.log(`POST /whats => ${event.body}`);

    const whatRequestMessage = JSON.parse(event.body!) as WhatRequestMessage;

    if (whatRequestMessage?.entry[0]?.changes[0]?.field === 'messages' &&
      whatRequestMessage?.entry[0]?.changes[0]?.value?.messages) {


      const phone_number_id = whatRequestMessage.entry[0].changes[0].value.metadata.phone_number_id;
      const from = whatRequestMessage.entry[0].changes[0].value.messages[0].from;
      const msg_body = whatRequestMessage.entry[0].changes[0].value.messages[0].text.body;

      const whats = buildWhatsMessage(whatRequestMessage, from, WhatsWeboHookTypes.TEXT)

      console.log(`phone_number_id: ${phone_number_id}, from: ${from}, msg_body: ${msg_body}`);

      const whatsCreated = await whatRepository.create(whats)

      return {
        statusCode: 201,
        body: JSON.stringify(whatsCreated)
      }
    }
  }

  if (method === 'GET') {
    console.log('GET /whats/webhook')

    const mode = event['queryStringParameters']?.['hub.mode']
    const token = event['queryStringParameters']?.['hub.verify_token']
    const challenge = event['queryStringParameters']?.['hub.challenge']

    if (mode && token) {
      if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        console.log("Validating webhook")
        return {
          statusCode: 200,
          body: challenge as string
        }
      } else {
        return {
          statusCode: 403,
          body: "Forbidden"
        }
      }
    }

    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Bad Request"
      })
    }
  }
}

function buildWhatsMessage(whatRequestMessage: WhatRequestMessage,
  from: string,
  webHookType: WhatsWeboHookTypes): WhatRequestMessage {


  const timestamp = Date.now()

  whatRequestMessage.id = uuid();
  whatRequestMessage.createdAt = timestamp;

  whatRequestMessage.pk = `#message_${from}`;
  whatRequestMessage.sk = `#${webHookType}#${timestamp}`;

  return whatRequestMessage;
}
