import { DocumentClient } from "aws-sdk/clients/dynamodb";


export enum WhatsWeboHookTypes {
  TEXT = "TEXT_MESSAGE",
  REACT = "REACT_MESSAGE",
  MIDIA = "MIDIA_MESSAGE",
  UNCKNOWN = "UNCKNOWN_MESSAGE",
  LOCATION = "LOCATION_MESSAGE",
  CONTACT = "CONTACT_MESSAGE",
  RESPONSE_QUICK_BUTTON = "RESPONSE_QUICK_BUTTON_MESSAGE",
  RESPONSE_LIST = "RESPONSE_LIST_MESSAGE",
  DELETED = "DELETED_MESSAGE",
  RESPONSE_BUTTON = "RESPONSE_BUTTON_MESSAGE",
  RESPONSE_MARKET = "RESPONSE_MARKET_MESSAGE",
  CHECK_PRODUCT = "CHECK_PRODUCT_MESSAGE",
  CHECKOUT = "CHECKOUT_MESSAGE",
  CHANGE_PHONE_NUMBER = "CHANGE_PHONE_NUMBER_MESSAGE",
}

export interface CallBackRequest {
  "hub.mode": string;
  "hub.challenge": string;
  "hub.verify_token": string;
}

export interface WhatRequestMessage {
  id: string;
  createdAt: number;
  pk: string;
  sk: string;
  object: string;
  entry: Entry[];
}

interface Entry {
  id: string;
  changes: Change[];
}

interface Change {
  field: string;
  value: Value;
}

interface Value {
  messaging_product: string;
  metadata: Metadata;
  messages: MessageWhats[];
  contacts: ContactsWhats[];
}

interface ContactsWhats {
  profile: Profile;
  wa_id: string;
}

interface Metadata {
  display_phone_number: string;
  phone_number_id: string;
}


interface MessageWhats {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text: Text;
}

interface Text {
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

  async create(what: WhatRequestMessage): Promise<WhatRequestMessage> {


    await this.ddbClient.put({
      TableName: this.whatsDdb,
      Item: what
    }).promise()
    return what
  }

}