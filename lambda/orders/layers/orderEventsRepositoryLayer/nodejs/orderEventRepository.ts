import { DocumentClient } from "aws-sdk/clients/dynamodb";

export interface OrderEventDdb {
  pk: string;
  sk: string;
  email: string;
  createdAt: number;
  requestId: string;
  eventType: string;
  info: {
    orderId: string;
    productCodes: string[];
    messageId: string;
  },
  ttl: number;
}


export class OrderEventRepository {
  private ddbClient: DocumentClient;
  private eventsDdb: string;

  constructor(ddbClient: DocumentClient, eventsDdb: string) {
    this.ddbClient = ddbClient;
    this.eventsDdb = eventsDdb;
  }

  async createOrderEvent(orderEvent: OrderEventDdb) {
    return this.ddbClient.put({
      TableName: this.eventsDdb,
      Item: orderEvent
    }).promise();
  }


}