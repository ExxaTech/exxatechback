import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const cognito = new AWS.CognitoIdentityServiceProvider();

export const handler: APIGatewayProxyHandler = async (event) => {
  const { CLIENT_ID, CLIENT_SECRET, USER_POOL_ID } = process.env;

  if (!CLIENT_ID || !CLIENT_SECRET || !USER_POOL_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Configuração ausente.' }),
    };
  }

  // Exemplo: autenticar usuário com InitiateAuth (exemplo fictício)
  try {
    const body = JSON.parse(event.body || '{}');
    const { username, password } = body;

    if (!username || !password) {
      return { statusCode: 400, body: 'username e password são obrigatórios' };
    }

    const params = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: generateSecretHash(username, CLIENT_ID, CLIENT_SECRET),
      },
    };

    const authResult = await cognito.initiateAuth(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(authResult),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Erro na autenticação', error }),
    };
  }
};

function generateSecretHash(username: string, clientId: string, clientSecret: string): string {
  const crypto = require('crypto');
  return crypto
    .createHmac('SHA256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}
