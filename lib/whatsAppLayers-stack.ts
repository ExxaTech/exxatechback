import * as cdk from "aws-cdk-lib"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as ssm from "aws-cdk-lib/aws-ssm"
import { Construct } from "constructs"


export class WhatsApplayersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const whatsLayers = new lambda.LayerVersion(this, "WhatsLayer", {
      code: lambda.Code.fromAsset('lambda/whats/layers/whatsLayer'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
      layerVersionName: "WhatsLayer",
      removalPolicy: cdk.RemovalPolicy.RETAIN
    })
    new ssm.StringParameter(this, "WhatsLayerVersionArn", {
      parameterName: "WhatsLayerVersionArn",
      stringValue: whatsLayers.layerVersionArn
    })
  }
}