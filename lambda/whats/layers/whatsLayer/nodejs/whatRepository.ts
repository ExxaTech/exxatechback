import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { v4 as uuid } from "uuid";

export interface CallBackRequest {
  "hub.mode": string;
  "hub.challenge": string;
  "hub.verify_token": string;
}

export interface WhatRequest {
  email: string;
  phone: string;
  body: string;
}

export interface What {
  pk: string;
  sk: string;
  createdAt: number;
  callBackJson: string;
}

export class WhatRepository {
  private ddbClient: DocumentClient
  private whatsDdb: string

  constructor(ddbClient: DocumentClient, whatsDdb: string) {
    this.ddbClient = ddbClient
    this.whatsDdb = whatsDdb
  }

  async create(what: What): Promise<What> {
    what.id = uuid()

    await this.ddbClient.put({
      TableName: this.whatsDdb,
      Item: what
    }).promise()
    return what
  }

}