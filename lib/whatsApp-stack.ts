import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class WhatsAppStack extends cdk.Stack {

  readonly whatsHandler: lambdaNodeJS.NodejsFunction

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const whatsDdb = new dynamodb.Table(this, 'whatsDdb', {
      tableName: 'whats',
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1
    })


    //Whats Layer
    const whatsLayerArn = ssm.StringParameter.valueForStringParameter(this, "WhatsLayerVersionArn")
    const whatsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "WhatsLayerVersionArn", whatsLayerArn)

    this.whatsHandler = new lambdaNodeJS.NodejsFunction(this, 'whatssHandler', {
      functionName: 'whatsFunction',
      entry: 'lambda/whats/whatsFunction.ts',
      handler: 'handler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(2),
      bundling: {
        minify: true,
        sourceMap: false
      },
      environment: {
        WHATS_DDB: whatsDdb.tableName,
        VERIFY_TOKEN: "@XL700transalp"
      },
      layers: [whatsLayer],
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
    })

    whatsDdb.grantReadWriteData(this.whatsHandler)
  }
}