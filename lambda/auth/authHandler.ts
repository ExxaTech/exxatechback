import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as crypto from 'crypto';

const cognito = new AWS.CognitoIdentityServiceProvider();

function generateSecretHash(username: string, clientId: string, clientSecret: string): string {
  return crypto
    .createHmac('SHA256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const { CLIENT_ID, CLIENT_SECRET, USER_POOL_ID } = process.env;

  if (!CLIENT_ID || !CLIENT_SECRET || !USER_POOL_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Parâmetros de ambiente ausentes.' }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Método não permitido' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const path = event.path.toLowerCase();

    if (path.endsWith('/auth/signup')) {
      // Fluxo de cadastro (signup)
      const { username, password, email } = body;
      if (!username || !password || !email) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'username, password e email são obrigatórios' }),
        };
      }
      const params = {
        ClientId: CLIENT_ID,
        Username: username,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email }
        ],
        SecretHash: generateSecretHash(username, CLIENT_ID, CLIENT_SECRET),
      };
      await cognito.signUp(params).promise();
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Usuário cadastrado. Verifique seu email para confirmar.' }),
      };
    } 
    
    else if (path.endsWith('/auth/confirm')) {
      // Confirmação do código enviado por email
      const { username, code } = body;
      if (!username || !code) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'username e code são obrigatórios' }),
        };
      }
      const params = {
        ClientId: CLIENT_ID,
        Username: username,
        ConfirmationCode: code,
        SecretHash: generateSecretHash(username, CLIENT_ID, CLIENT_SECRET),
      };
      await cognito.confirmSignUp(params).promise();
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Usuário confirmado com sucesso.' }),
      };
    } 
    
    else if (path.endsWith('/auth/resend')) {
      // Reenviar código de confirmação
      const { username } = body;
      if (!username) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'username é obrigatório' }),
        };
      }
      const params = {
        ClientId: CLIENT_ID,
        Username: username,
        SecretHash: generateSecretHash(username, CLIENT_ID, CLIENT_SECRET),
      };
      await cognito.resendConfirmationCode(params).promise();
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Código reenviado com sucesso.' }),
      };
    } 
    
    else if (path.endsWith('/auth/login') || path.endsWith('/auth')) {
      // Login
      const { username, password } = body;
      if (!username || !password) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'username e password são obrigatórios' }),
        };
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
      const result = await cognito.initiateAuth(params).promise();
      return {
        statusCode: 200,
        body: JSON.stringify({
          accessToken: result.AuthenticationResult?.AccessToken,
          idToken: result.AuthenticationResult?.IdToken,
          refreshToken: result.AuthenticationResult?.RefreshToken,
          expiresIn: result.AuthenticationResult?.ExpiresIn,
          tokenType: result.AuthenticationResult?.TokenType,
        }),
      };
    }

    // Se a rota não for nenhuma das acima:
    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Rota não encontrada' }),
    };

  } catch (error: any) {
    console.error('Erro no handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Erro interno no servidor',
        error: error.message || 'Erro desconhecido',
      }),
    };
  }
};
