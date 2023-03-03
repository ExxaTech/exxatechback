#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { EcommerceApiStack } from '../lib/ecommerceApi-stack';
import { ProductsAppStack } from '../lib/productsApp-stack';
import { ProductsApplayersStack } from '../lib/productsAppLayers-stack';


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

const productsAppStack = new ProductsAppStack(app, "ProductsApp", {
  tags: tags,
  env: env
})
productsAppStack.addDependency(productsAppLayersStack)

const eCommerceApiStack = new EcommerceApiStack(app, "EcommerceApi", {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  tags: tags,
  env: env
})

eCommerceApiStack.addDependency(productsAppStack)