import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class SsmParamsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new ssm.StringParameter(this, 'ClientIdParam', {
      parameterName: '/auth/cognito/clientId',
      stringValue: '3eopfda3av5it40ekl9sfb9inm',
    });

    new ssm.StringParameter(this, 'ClientSecretParam', {
      parameterName: '/auth/cognito/clientSecret',
      stringValue: 'substituir_secret',
    });

    new ssm.StringParameter(this, 'UserPoolIdParam', {
      parameterName: '/auth/cognito/userPoolId',
      stringValue: 'us-east-1_ZunaAiK1n',
    });
  }
}