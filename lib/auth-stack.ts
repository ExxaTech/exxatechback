import * as cdk from 'aws-cdk-lib';
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface AuthStackProps extends cdk.StackProps {}

export class AuthStack extends cdk.Stack {
  public readonly authLambda: lambdaNodeJS.NodejsFunction;

  constructor(scope: Construct, id: string, props?: AuthStackProps) {
    super(scope, id, props);

    // Busca parâmetros no SSM
    const clientIdParam = ssm.StringParameter.fromStringParameterName(this, 'ClientIdParam', '/auth/cognito/clientId');
    const clientSecretParam = ssm.StringParameter.fromStringParameterName(this, 'ClientSecretParam', '/auth/cognito/clientSecret');
    const userPoolIdParam = ssm.StringParameter.fromStringParameterName(this, 'UserPoolIdParam', '/auth/cognito/userPoolId');

    // Cria a Lambda NodeJS
    this.authLambda = new lambdaNodeJS.NodejsFunction(this, 'AuthLambdaFunction', {
      entry: 'lambda/auth/authHandler.ts', // caminho do handler TS
      handler: 'handler',
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      environment: {
        CLIENT_ID: clientIdParam.stringValue,
        CLIENT_SECRET: clientSecretParam.stringValue,
        USER_POOL_ID: userPoolIdParam.stringValue,
      },
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      bundling: {
        minify: true,
        sourceMap: false,
      },
      tracing: cdk.aws_lambda.Tracing.ACTIVE,
      insightsVersion: cdk.aws_lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
    });

    // Permissão para usar cognito-idp:InitiateAuth no User Pool
    this.authLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:InitiateAuth'],
        resources: [`arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${userPoolIdParam.stringValue}`],
      }),
    );
  }
}
