import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class GlobalProductCatalogStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const productsTable = new dynamodb.Table(this, 'ProductsTable', {
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'productId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Use RETAIN in production
    });

    // Add GSI for translations
    productsTable.addGlobalSecondaryIndex({
      indexName: 'TranslationIndex',
      partitionKey: { name: 'translationKey', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'language', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Lambda Functions
    const postItemLambda = new nodejs.NodejsFunction(this, 'PostItemFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambdas/post-item.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: productsTable.tableName,
      },
    });

    const getItemLambda = new nodejs.NodejsFunction(this, 'GetItemFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambdas/get-item.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: productsTable.tableName,
      },
    });

    const putItemLambda = new nodejs.NodejsFunction(this, 'PutItemFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambdas/put-item.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: productsTable.tableName,
      },
    });

    const translateItemLambda = new nodejs.NodejsFunction(this, 'TranslateItemFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambdas/translate-item.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: productsTable.tableName,
      },
    });

    // Grant permissions to Lambda functions
    productsTable.grantReadWriteData(postItemLambda);
    productsTable.grantReadWriteData(getItemLambda);
    productsTable.grantReadWriteData(putItemLambda);
    productsTable.grantReadWriteData(translateItemLambda);

    // Give translate lambda permission to use the translate service
    translateItemLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['translate:TranslateText'],
      resources: ['*'],
    }));

    // API Gateway
    const api = new apigateway.RestApi(this, 'GlobalProductCatalogApi', {
      restApiName: 'Global Product Catalog Service',
    });

    // API Key for Authorization
    const apiKey = new apigateway.ApiKey(this, 'ProductApiKey', {
      apiKeyName: 'product-api-key',
      enabled: true,
    });
    
    // Create usage plan
    const plan = new apigateway.UsagePlan(this, 'UsagePlan', {
      name: 'Easy',
      throttle: {
        rateLimit: 10,
        burstLimit: 2
      }
    });
    
    // Add API stages and key to the usage plan
    plan.addApiStage({
      stage: api.deploymentStage
    });
    plan.addApiKey(apiKey);

    // API Endpoints
    const products = api.root.addResource('products');
    products.addMethod('POST', new apigateway.LambdaIntegration(postItemLambda), {
      apiKeyRequired: true,
    });
    products.addMethod('GET', new apigateway.LambdaIntegration(getItemLambda));

    const product = products.addResource('{category}');
    product.addMethod('GET', new apigateway.LambdaIntegration(getItemLambda));

    const productItem = product.addResource('{productId}');
    productItem.addMethod('PUT', new apigateway.LambdaIntegration(putItemLambda), {
      apiKeyRequired: true,
    });

    const translation = productItem.addResource('translation');
    translation.addMethod('GET', new apigateway.LambdaIntegration(translateItemLambda));
    
    // Stack outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'The URL of the API Gateway',
    });
    
    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: apiKey.keyId,
      description: 'The ID of the API Key. Use "aws apigateway get-api-key --api-key [THIS_VALUE] --include-value" to get the value',
    });
  }
}