import * as cdk from 'aws-cdk-lib';
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface AuthStackProps extends cdk.StackProps {}

export class AuthStack extends cdk.Stack {
  public readonly authLambda: lambdaNodeJS.NodejsFunction;

  constructor(scope: Construct, id: string, props?: AuthStackProps) {
    super(scope, id, props);

    const clientId = ssm.StringParameter.valueForStringParameter(this, '/auth/cognito/clientId');
    const clientSecret = ssm.StringParameter.valueForStringParameter(this, '/auth/cognito/clientSecret');
    const userPoolId = ssm.StringParameter.valueForStringParameter(this, '/auth/cognito/userPoolId');

    this.authLambda = new lambdaNodeJS.NodejsFunction(this, 'AuthLambdaFunction', {
      entry: 'lambda/auth/authHandler.ts',
      handler: 'handler',
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      environment: {
        CLIENT_ID: clientId,
        CLIENT_SECRET: clientSecret,
        USER_POOL_ID: userPoolId,
      },
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      bundling: {
        minify: true,
        sourceMap: false,
        esbuildArgs: {
          '--packages': 'bundle',
        },
      },
      tracing: cdk.aws_lambda.Tracing.ACTIVE,
      insightsVersion: cdk.aws_lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
    });

    this.authLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:InitiateAuth'],
        resources: [`arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${userPoolId}`],
      }),
    );
  }
}
