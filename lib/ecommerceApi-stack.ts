import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cwlogs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface EcommerceApiStackProps extends cdk.StackProps {
    productsFetchHandler: lambdaNodeJS.NodejsFunction
    productsAdminHandler: lambdaNodeJS.NodejsFunction
}

export class EcommerceApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: EcommerceApiStackProps) {
        super(scope, id, props)

        const logGroup = new cwlogs.LogGroup(this, "EcommerceApiLogs")

        const api = new apigateway.RestApi(this, "EcommerceApi", {
            restApiName: "EcommerceApi",
            deployOptions: {
                accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
                accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
                    httpMethod: true,
                    ip: true,
                    protocol: true,
                    requestTime: true,
                    resourcePath: true,
                    responseLength: true,
                    status: true,
                    caller: true,
                    user: true
                })
            }
        })

        const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler)
        const productsAdminIntegration = new apigateway.LambdaIntegration(props.productsAdminHandler)

        const productsResource = api.root.addResource("products")
        const productIdResource = productsResource.addResource("{id}")

        // ROUTES
        // GET /products        
        productsResource.addMethod("GET", productsFetchIntegration)

        // GET /products/{id}
        productIdResource.addMethod("GET", productsFetchIntegration)

        // POST /products        
        productsResource.addMethod("POST", productsAdminIntegration)

        // PUT /products/{id}
        productIdResource.addMethod("PUT", productsAdminIntegration)

        // DELETE /products/{id}
        productIdResource.addMethod("DELETE", productsAdminIntegration)

    }
}