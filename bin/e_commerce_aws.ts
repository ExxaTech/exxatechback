import * as cdk from 'aws-cdk-lib';
import { EcommerceApiStack } from '../lib/ecommerceApi-stack';
import { EventsDdbStack } from '../lib/eventsDdb-stack';
import { OrdersAppStack } from '../lib/ordersApp-stack';
import { OrdersAppLayersStack } from '../lib/ordersAppLayers-stack';
import { ProductsAppStack } from '../lib/productsApp-stack';
import { ProductsApplayersStack } from '../lib/productsAppLayers-stack';
import { WhatsAppStack } from '../lib/whatsApp-stack';
import { WhatsApplayersStack } from '../lib/whatsAppLayers-stack';
import { AuthStack } from '../lib/auth-stack';  
import { SsmParamsStack } from '../lib/ssm-params-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account: "371765964276",
  region: "us-east-1"
}

const tags = {
  cost: "Ecommerce",
  team: "Exxatech"
}

const productsAppLayersStack = new ProductsApplayersStack(app, "ProductsAppLayers", {
  tags: tags,
  env: env
})

const eventsDdbStack = new EventsDdbStack(app, "EventsDdb", {
  tags: tags,
  env: env
})

const productsAppStack = new ProductsAppStack(app, "ProductsApp", {
  eventsDdb: eventsDdbStack.table,
  tags: tags,
  env: env
})
productsAppStack.addDependency(productsAppLayersStack)
productsAppStack.addDependency(eventsDdbStack)

const ordersAppLayersStack = new OrdersAppLayersStack(app, "OrdersAppLayers", {
  tags: tags,
  env: env
})

const ordersAppStack = new OrdersAppStack(app, "OrdersApp", {
  tags: tags,
  env: env,
  productsDdb: productsAppStack.productsDdb,
  eventsDdb: eventsDdbStack.table,
})
ordersAppStack.addDependency(productsAppStack)
ordersAppStack.addDependency(ordersAppLayersStack)
ordersAppStack.addDependency(eventsDdbStack)


const whatsApplayersStack = new WhatsApplayersStack(app, "WhatsApplayers", {
  tags: tags,
  env: env
})

const whatsAppStack = new WhatsAppStack(app, "WhatsApp", {
  tags: tags,
  env: env,
})

const ssmParamsStack = new SsmParamsStack(app, 'SsmParamsStack', {
  tags,
  env,
});

whatsAppStack.addDependency(whatsApplayersStack)

const authStack = new AuthStack(app, "AuthStack", { tags, env });
authStack.addDependency(ssmParamsStack);


const eCommerceApiStack = new EcommerceApiStack(app, "EcommerceApi", {
  productsFetchHandlerArn: productsAppStack.productsFetchHandler.functionArn,
  productsAdminHandlerArn: productsAppStack.productsAdminHandler.functionArn,
  ordersHandler: ordersAppStack.ordersHandler,
  whatsHandler: whatsAppStack.whatsHandler,
  authHandler: authStack.authLambda, 
  tags: tags,
  env: env
})

eCommerceApiStack.addDependency(productsAppStack)
eCommerceApiStack.addDependency(ordersAppStack)
eCommerceApiStack.addDependency(authStack);