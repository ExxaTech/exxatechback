import * as cdk from 'aws-cdk-lib';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from 'constructs';

interface ProductsAppStackProps extends cdk.StackProps {
    eventsDdb: dynamodb.Table
}

export class ProductsAppStack extends cdk.Stack {
    readonly productsFetchHandler: lambdaNodeJS.NodejsFunction
    readonly productsAdminHandler: lambdaNodeJS.NodejsFunction
    readonly productsDdb: dynamodb.Table

    public readonly productsFetchHandlerArn: string;
    public readonly productsAdminHandlerArn: string;

    constructor(scope: Construct, id: string, props: ProductsAppStackProps) {
        super(scope, id, props)

        this.productsDdb = new dynamodb.Table(this, "ProductsDdb", {
            tableName: "products",
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            partitionKey: {
                name: "id",
                type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PROVISIONED,
            readCapacity: 1,
            writeCapacity: 1
        })

        //Products Layer
        const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, "ProductsLayerVersionArn")
        const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayerArn)

        //Products Events Layer
        const productEventsLayerArn = ssm.StringParameter.valueForStringParameter(this, "ProductEventsLayerVersionArn")
        const productEventsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductEventsLayerVersionArn", productEventsLayerArn)


        const productsEventsHandler = new lambdaNodeJS.NodejsFunction(this,
            'ProductsEventsFunction', {
            functionName: "ProductsEventsFunction",
            entry: "lambda/products/productEventsFunction.ts",
            handler: "handler",
            memorySize: 128,
            timeout: cdk.Duration.seconds(2),
            bundling: {
                minify: true,
                sourceMap: false,
                esbuildArgs: {
                    '--packages': 'bundle',
                },
            },
            environment: {
                EVENTS_DDB: props.eventsDdb.tableName
            },
            layers: [productEventsLayer],
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        })
        props.eventsDdb.grantWriteData(productsEventsHandler)

        this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(this,
            'ProductsFetchFunction',
            {
                functionName: "ProductsFetchFunction",
                entry: "lambda/products/productsFetchFunction.ts",
                handler: "handler",
                memorySize: 128,
                timeout: cdk.Duration.seconds(5),
                bundling: {
                    minify: true,
                    sourceMap: false,
                    esbuildArgs: {
                        '--packages': 'bundle',
                    },
                },
                environment: {
                    PRODCUTS_DDB: this.productsDdb.tableName
                },
                layers: [productsLayer],
                tracing: lambda.Tracing.ACTIVE,
                insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
            })

        this.productsAdminHandler = new lambdaNodeJS.NodejsFunction(this,
            'ProductsAdminFunction',
            {
                functionName: "ProductsAdminFunction",
                entry: "lambda/products/productsAdminFunction.ts",
                handler: "handler",
                memorySize: 128,
                timeout: cdk.Duration.seconds(5),
                bundling: {
                    minify: true,
                    sourceMap: false
                },
                environment: {
                    PRODCUTS_DDB: this.productsDdb.tableName,
                    PRODUCTS_EVENTS_FUNCTION_NAME: productsEventsHandler.functionName
                },
                layers: [productsLayer, productEventsLayer],
                tracing: lambda.Tracing.ACTIVE,
                insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
            })


        this.productsDdb.grantWriteData(this.productsAdminHandler)
        this.productsDdb.grantReadData(this.productsFetchHandler)


        productsEventsHandler.grantInvoke(this.productsAdminHandler)

        this.productsFetchHandlerArn = this.productsFetchHandler.functionArn;
        this.productsAdminHandlerArn = this.productsAdminHandler.functionArn;

        // this.exportValue(this.productsFetchHandler.functionArn, {
        //     name: 'ProductsFetchHandlerArnExport'
        // });
        // this.exportValue(this.productsAdminHandler.functionArn, {
        //     name: 'ProductsAdminHandlerArnExport'
        // });
    }
}