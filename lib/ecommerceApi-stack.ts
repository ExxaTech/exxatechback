    import * as cdk from 'aws-cdk-lib';
    import * as apigateway from 'aws-cdk-lib/aws-apigateway';
    import * as cognito from 'aws-cdk-lib/aws-cognito';
    import * as lambda from 'aws-cdk-lib/aws-lambda';
    import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
    import * as cwlogs from 'aws-cdk-lib/aws-logs';
    import { Construct } from 'constructs';


    interface EcommerceApiStackProps extends cdk.StackProps {
        productsFetchHandlerArn: string;
        productsAdminHandlerArn: string;
        ordersHandler: lambdaNodeJS.NodejsFunction
        whatsHandler: lambdaNodeJS.NodejsFunction
        authHandler: lambda.IFunction; 
    }

    export class EcommerceApiStack extends cdk.Stack {

        private productsAuthorizer: apigateway.CognitoUserPoolsAuthorizer;
        private productsAdminAuthorizer: apigateway.CognitoUserPoolsAuthorizer
        private customerPool: cognito.UserPool;
        private adminPool: cognito.UserPool;

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

            this.createCognitoAuth();
            this.createProductsService(props, api);
            this.createOrdersService(props, api);
            this.createWhatsService(props, api);
            this.createAuthRoutes(props, api);

        }

        private createAuthRoutes(props: EcommerceApiStackProps, api: apigateway.RestApi) {
        const authIntegration = new apigateway.LambdaIntegration(props.authHandler);

        const authResource = api.root.addResource('auth');
        authResource.addMethod('POST', authIntegration); 

        const signupResource = authResource.addResource('signup');
        signupResource.addMethod('POST', authIntegration); 

        const loginResource = authResource.addResource('login');
        loginResource.addMethod('POST', authIntegration);

        const confirmResource = authResource.addResource('confirm');
        confirmResource.addMethod('POST', authIntegration); 

        const resendResource = authResource.addResource('resend');
        resendResource.addMethod('POST', authIntegration);
    }

        private createCognitoAuth() {
            const postConfirmationHandler = new lambdaNodeJS.NodejsFunction(this, "PostConfirmationFunction", {
                functionName: "PostConfirmationFunction",
                entry: "lambda/auth/postConfirmationFunction.ts",
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
                tracing: lambda.Tracing.ACTIVE,
                insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
            })

            const preAuthenticationHandler = new lambdaNodeJS.NodejsFunction(this, "PreAuthenticationFunction", {
                functionName: "PreAuthenticationnFunction",
                entry: "lambda/auth/preAuthenticationnFunction.ts",
                handler: "handler",
                memorySize: 128,
                timeout: cdk.Duration.seconds(2),
                bundling: {
                    minify: true,
                    sourceMap: false
                },
                tracing: lambda.Tracing.ACTIVE,
                insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
            })

            //Cognito customer UserPool
            this.customerPool = new cognito.UserPool(this, "CustomerPool", {
                lambdaTriggers: {
                    preAuthentication: preAuthenticationHandler,
                    postConfirmation: postConfirmationHandler
                },
                userPoolName: "CustomerPool",
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                selfSignUpEnabled: true,
                autoVerify: {
                    email: true,
                    phone: false
                },
                userVerification: {
                    emailSubject: "Verify your email for the ECommerce service!",
                    emailBody: "Thanks for signing up to ECommerce service! Your verification code is {####}",
                    emailStyle: cognito.VerificationEmailStyle.CODE
                },
                signInAliases: {
                    username: false,
                    email: true
                },
                standardAttributes: {
                    fullname: {
                        required: true,
                        mutable: false
                    },
                },
                passwordPolicy: {
                    minLength: 8,
                    requireLowercase: true,
                    requireUppercase: true,
                    requireDigits: true,
                    requireSymbols: true,
                    tempPasswordValidity: cdk.Duration.days(3)
                },
                accountRecovery: cognito.AccountRecovery.EMAIL_ONLY
            })

            //Cognito admin UserPool
            this.adminPool = new cognito.UserPool(this, "AdminPool", {
                userPoolName: "AdminPool",
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                selfSignUpEnabled: false,
                userInvitation: {
                    emailSubject: "Welcome to ECommerce administrator service",
                    emailBody: 'Your username is {username} and temporary password is {####}'
                },
                signInAliases: {
                    username: false,
                    email: true
                },
                standardAttributes: {
                    email: {
                        required: true,
                        mutable: false
                    },
                },
                passwordPolicy: {
                    minLength: 8,
                    requireLowercase: true,
                    requireUppercase: true,
                    requireDigits: true,
                    requireSymbols: true,
                    tempPasswordValidity: cdk.Duration.days(3)
                },
                accountRecovery: cognito.AccountRecovery.EMAIL_ONLY
            })

            this.customerPool.addDomain("CustomerDomain", {
                cognitoDomain: {
                    domainPrefix: "exxatech-customer-service"
                }
            })

            this.adminPool.addDomain("AdminDomain", {
                cognitoDomain: {
                    domainPrefix: "exxatech-admin-service"
                }
            })

            const customerWebScope = new cognito.ResourceServerScope({
                scopeName: "web",
                scopeDescription: "Customer Web operation"
            })

            const customerMobileScope = new cognito.ResourceServerScope({
                scopeName: "mobile",
                scopeDescription: "Customer Mobile operation"
            })

            const adminWebScope = new cognito.ResourceServerScope({
                scopeName: "web",
                scopeDescription: "Admin Web operation"
            })

            const customerResourceServer = this.customerPool.addResourceServer("CustomerResourceServer", {
                identifier: "customer",
                userPoolResourceServerName: "CustomerResourceServer",
                scopes: [customerMobileScope, customerWebScope]
            })

            const adminResourceServer = this.adminPool.addResourceServer("AdminResourceServer", {
                identifier: "admin",
                userPoolResourceServerName: "AdminResourceServer",
                scopes: [adminWebScope]
            })

            this.customerPool.addClient("customer-web-client", {
                userPoolClientName: "customerWebClient",
                authFlows: {
                    userPassword: true
                },
                accessTokenValidity: cdk.Duration.minutes(60),
                refreshTokenValidity: cdk.Duration.days(7),
                oAuth: {
                    scopes: [cognito.OAuthScope.resourceServer(customerResourceServer, customerWebScope)]
                }
            })

            this.customerPool.addClient("customer-mobile-client", {
                userPoolClientName: "customerMobileClient",
                authFlows: {
                    userPassword: true
                },
                accessTokenValidity: cdk.Duration.minutes(60),
                refreshTokenValidity: cdk.Duration.days(7),
                oAuth: {
                    scopes: [cognito.OAuthScope.resourceServer(customerResourceServer, customerMobileScope)]
                }
            })

            this.adminPool.addClient("admin-web-client", {
                userPoolClientName: "adminWebClient",
                authFlows: {
                    userPassword: true
                },
                accessTokenValidity: cdk.Duration.minutes(60),
                refreshTokenValidity: cdk.Duration.days(7),
                oAuth: {
                    scopes: [cognito.OAuthScope.resourceServer(adminResourceServer, adminWebScope)]
                }
            })

            this.productsAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "ProductsAuthorizer", {
                authorizerName: "ProductsAuthorizer",
                cognitoUserPools: [this.customerPool, this.adminPool]
            })

            this.productsAdminAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "ProductsAdminAuthorizer", {
                authorizerName: "ProductsAdminAuthorizer",
                cognitoUserPools: [this.adminPool]
            })


        }

        private createOrdersService(props: EcommerceApiStackProps, api: apigateway.RestApi) {
            const ordersIntegration = new apigateway.LambdaIntegration(props.ordersHandler);

            //resource - /orders
            const ordersResource = api.root.addResource("orders")

            //GET /orders
            //GET /orders?email=milton@testto.com.br
            //GET /orders?email=milton@testto.com.br&orderId=123
            ordersResource.addMethod("GET", ordersIntegration);

            //DELETE /orders?email=milton@testto.com.br&orderId=123
            const orderDeletionValidator = new apigateway.RequestValidator(this, "OrderDeletionValidator", {
                restApi: api,
                requestValidatorName: "OrderDeletionValidator",
                validateRequestParameters: true
            })

            ordersResource.addMethod("DELETE", ordersIntegration, {
                requestParameters: {
                    'method.request.querystring.email': true,
                    'method.request.querystring.orderId': true,
                },
                requestValidator: orderDeletionValidator
            });

            //POST /orders
            const orderRequestValidator = new apigateway.RequestValidator(this, "OrderRequestValidator", {
                restApi: api,
                requestValidatorName: "OrderRequestValidator",
                validateRequestBody: true
            })

            const orderModel = new apigateway.Model(this, "OrderModel", {
                modelName: "OrderModel",
                restApi: api,
                schema: {
                    type: apigateway.JsonSchemaType.OBJECT,
                    properties: {
                        email: {
                            type: apigateway.JsonSchemaType.STRING
                        },
                        productIds: {
                            type: apigateway.JsonSchemaType.ARRAY,
                            minItems: 1,
                            items: {
                                type: apigateway.JsonSchemaType.STRING
                            }
                        },
                        payment: {
                            type: apigateway.JsonSchemaType.STRING,
                            enum: ["CASH", "DEBIT_CARD", "CREDIT_CARD"]
                        }
                    },
                    required: [
                        "email",
                        "productIds",
                        "payment"
                    ]
                }
            })

            ordersResource.addMethod("POST", ordersIntegration, {
                requestModels: {
                    "application/json": orderModel
                },
                requestValidator: orderRequestValidator
            });
        }

        private createWhatsService(props: EcommerceApiStackProps, api: apigateway.RestApi) {
            const whatsIntegration = new apigateway.LambdaIntegration(props.whatsHandler);

            //resource - /whats
            const whatsResource = api.root.addResource("whats")
            const whatsWebHookResource = whatsResource.addResource("webhook")

            //methods webhook
            whatsWebHookResource.addMethod("GET", whatsIntegration);
            whatsWebHookResource.addMethod("POST", whatsIntegration);
        }

        private createProductsService(props: EcommerceApiStackProps, api: apigateway.RestApi) {

            const productsAdminIntegration = new apigateway.Integration({
                type: apigateway.IntegrationType.AWS_PROXY,
                integrationHttpMethod: 'POST',
                uri: `arn:aws:apigateway:${cdk.Stack.of(this).region}:lambda:path/2015-03-31/functions/${props.productsAdminHandlerArn}/invocations`
            });

            const productsFetchIntegration = new apigateway.Integration({
                type: apigateway.IntegrationType.AWS_PROXY,
                integrationHttpMethod: 'POST',
                uri: `arn:aws:apigateway:${cdk.Stack.of(this).region}:lambda:path/2015-03-31/functions/${props.productsFetchHandlerArn}/invocations`
            });


            const productsFetchWebMobileIntegrationOption = {
                authorizer: this.productsAuthorizer,
                authorizationType: apigateway.AuthorizationType.COGNITO,
                authorizationScopes: ['customer/web', 'customer/mobile']
            }

            const productsFetchWebIntegrationOption = {
                authorizer: this.productsAuthorizer,
                authorizationType: apigateway.AuthorizationType.COGNITO,
                authorizationScopes: ['customer/web']
            }


            const productsResource = api.root.addResource("products");
            const productIdResource = productsResource.addResource("{id}");

            // ROUTES
            // GET /products        
            productsResource.addMethod("GET", productsFetchIntegration, productsFetchWebMobileIntegrationOption);

            // GET /products/{id}
            productIdResource.addMethod("GET", productsFetchIntegration, productsFetchWebIntegrationOption);

            // POST /products    
            const productRequestValidator = new apigateway.RequestValidator(this, "ProductRequestValidator", {
                restApi: api,
                requestValidatorName: "ProductRequestValidator",
                validateRequestBody: true
            })

            const productModel = new apigateway.Model(this, "ProductModel", {
                modelName: "ProductModel",
                restApi: api,
                schema: {
                    type: apigateway.JsonSchemaType.OBJECT,
                    properties: {
                        productName: {
                            type: apigateway.JsonSchemaType.STRING
                        },
                        code: {
                            type: apigateway.JsonSchemaType.STRING
                        },
                        price: {
                            type: apigateway.JsonSchemaType.NUMBER
                        },
                        model: {
                            type: apigateway.JsonSchemaType.STRING
                        },
                        productUrl: {
                            type: apigateway.JsonSchemaType.STRING
                        },
                    },
                    required: [
                        "productName",
                        "code",
                        "price"
                    ]
                }
            })

            productsResource.addMethod("POST", productsAdminIntegration, {
                requestModels: {
                    "application/json": productModel
                },
                requestValidator: productRequestValidator,
                authorizer: this.productsAdminAuthorizer,
                authorizationType: apigateway.AuthorizationType.COGNITO,
                authorizationScopes: ['admin/web']
            });

            // PUT /products/{id}
            productIdResource.addMethod("PUT", productsAdminIntegration, {
                requestValidator: productRequestValidator,
                requestModels: {
                    "application/json": productModel
                },
                authorizer: this.productsAdminAuthorizer,
                authorizationType: apigateway.AuthorizationType.COGNITO,
                authorizationScopes: ['admin/web']
            })

            // DELETE /products/{id}
            productIdResource.addMethod("DELETE", productsAdminIntegration, {
                authorizer: this.productsAdminAuthorizer,
                authorizationType: apigateway.AuthorizationType.COGNITO,
                authorizationScopes: ['admin/web']
            })
        }
    }