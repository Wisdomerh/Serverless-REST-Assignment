// lib/constructs/product-api.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface ProductApiProps {
  getItemFunction: lambda.IFunction;
  postItemFunction: lambda.IFunction;
  putItemFunction: lambda.IFunction;
  translateItemFunction: lambda.IFunction;
}

export class ProductApi extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly apiKey: apigateway.ApiKey;

  constructor(scope: Construct, id: string, props: ProductApiProps) {
    super(scope, id);

    // API Gateway without any logging configuration
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: 'Global Product Catalog Service',
      description: 'API for managing global product catalog',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    // API Key for Authorization with unique name
    this.apiKey = new apigateway.ApiKey(this, 'ApiKey', {
      apiKeyName: `product-api-key-${Date.now()}`, // Add timestamp to make unique
      enabled: true,
    });


    const plan = new apigateway.UsagePlan(this, 'UsagePlan', {
      name: 'Standard',
      throttle: {
        rateLimit: 10,
        burstLimit: 2,
      },
    });

    // Add API stages and key to the usage plan
    plan.addApiStage({
      stage: this.api.deploymentStage,
    });
    plan.addApiKey(this.apiKey);

    // API Endpoints
    const products = this.api.root.addResource('products');

    // POST /products
    products.addMethod('POST', new apigateway.LambdaIntegration(props.postItemFunction), {
      apiKeyRequired: true,
    });

    // GET /products
    products.addMethod('GET', new apigateway.LambdaIntegration(props.getItemFunction));

    // GET /products/{category}
    const product = products.addResource('{category}');
    product.addMethod('GET', new apigateway.LambdaIntegration(props.getItemFunction));

    // PUT /products/{category}/{productId}
    const productItem = product.addResource('{productId}');
    productItem.addMethod('PUT', new apigateway.LambdaIntegration(props.putItemFunction), {
      apiKeyRequired: true,
    });

    // GET /products/{category}/{productId}/translation
    const translation = productItem.addResource('translation');
    translation.addMethod('GET', new apigateway.LambdaIntegration(props.translateItemFunction));
  }
}