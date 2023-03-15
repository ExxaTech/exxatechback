import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda"
import { DynamoDB } from "aws-sdk"
import * as AWSXRay from "aws-xray-sdk"
import { Order, OrderRepository } from "./layers/ordersLayer/nodejs/orderRepository"
import { CarrierType, OrderProductResponse, OrderRequest, OrderResponse, PaymentType, ShippingType } from "/opt/nodejs/ordersApiLayer"
import { Product, ProductRepository } from "/opt/nodejs/productsLayer"

AWSXRay.captureAWS(require("aws-sdk"))

const productsDdb = process.env.PRODUCTS_DDB!
const orderstDdb = process.env.ORDERS_DDB!

const ddbClient = new DynamoDB.DocumentClient()

const orderRepository = new OrderRepository(ddbClient, orderstDdb)
const productRepository = new ProductRepository(ddbClient, productsDdb)


export async function handler(event: APIGatewayProxyEvent, context: Context):
  Promise<APIGatewayProxyResult> {

  const method = event.httpMethod
  const apiRequestId = event.requestContext.requestId
  const lambdaRequestId = context.awsRequestId

  console.log(`API Gateway RequestId: ${apiRequestId} - LambdaRquestId: ${lambdaRequestId}`)

  if (method === 'GET') {
    if (event.queryStringParameters) {
      const email = event.queryStringParameters!.email
      const orderId = event.queryStringParameters!.orderId
      if (email) {
        if (orderId) {
          //Get one order from an user
          try {
            const order = await orderRepository.getOrder(email, orderId)
            return {
              statusCode: 200,
              body: JSON.stringify(convertToOrderResponse(order))
            }
          } catch (error) {
            console.log((<Error>error).message)
            return {
              statusCode: 404,
              body: (<Error>error).message
            }
          }
        } else {
          //Get all orders from an user
          const orders = await orderRepository.getOrdersByEmail(email)
          return {
            statusCode: 200,
            body: JSON.stringify(orders.map(convertToOrderResponse))
          }
        }
      }
    } else {
      //Get all orders
      const orders = await orderRepository.getAllOrders()
      return {
        statusCode: 200,
        body: JSON.stringify(orders.map(convertToOrderResponse))
      }
    }
  } else if (method === 'POST') {
    console.log('POST /orders')
    const orderRequest = JSON.parse(event.body!) as OrderRequest
    const products = await productRepository.getProductsByIds(orderRequest.productIds)

    if (products.length === orderRequest.productIds.length) {
      const order = buildOrder(orderRequest, products)

      const orderCreated = await orderRepository.createOrder(order)

      return {
        statusCode: 201,
        body: JSON.stringify(convertToOrderResponse(orderCreated))
      }

    } else {
      return {
        statusCode: 404,
        body: "Some product was not found"
      }
    }

  } else if (method === 'DELETE') {
    console.log('DELETE /orders')
    const email = event.queryStringParameters!.email!
    const orderId = event.queryStringParameters!.orderId!

    if (email && orderId) {
      //GET specific order from user    
      try {
        const order = await orderRepository.deleteOrder(email, orderId)
        return {
          statusCode: 200,
          body: JSON.stringify(convertToOrderResponse(order))
        }
      } catch (error) {
        console.error((<Error>error).message)
        return {
          statusCode: 404,
          body: (<Error>error).message
        }
      }
    }

  }

  return {
    statusCode: 400,
    body: 'Bad Request'
  }
}


function convertToOrderResponse(order: Order): OrderResponse {

  const orderProducts: OrderProductResponse[] = []
  order.products.forEach((product) => {
    orderProducts.push({
      code: product.code,
      price: product.price
    })
  })

  const orderResponse: OrderResponse = {
    email: order.pk,
    id: order.sk!,
    createdAt: order.createdAt!,
    products: orderProducts,
    billing: {
      payment: order.billing.payment as PaymentType,
      totalPrice: order.billing.totalPrice
    },
    shipping: {
      type: order.shipping.type as ShippingType,
      carrier: order.shipping.carrier as CarrierType
    }
  }

  return orderResponse
}


function buildOrder(orderRequest: OrderRequest, products: Product[]): Order {

  const orderProducts: OrderProductResponse[] = []
  let totalPrice = 0

  products.forEach((product) => {
    totalPrice += product.price,
      orderProducts.push({
        code: product.code,
        price: product.price
      })
  })

  const order: Order = {
    pk: orderRequest.email,
    billing: {
      payment: orderRequest.payment,
      totalPrice: totalPrice
    },
    shipping: {
      type: orderRequest.shipping.type,
      carrier: orderRequest.shipping.carrier
    },
    products: orderProducts
  }

  return order
}