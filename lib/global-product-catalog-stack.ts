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
      entry: path.join(__dirname, '../src/post-item.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: productsTable.tableName,
      },
    });

    const getItemLambda = new nodejs.NodejsFunction(this, 'GetItemFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../src/get-item.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: productsTable.tableName,
      },
    });

    const putItemLambda = new nodejs.NodejsFunction(this, 'PutItemFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../src/put-item.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: productsTable.tableName,
      },
    });

    const translateItemLambda = new nodejs.NodejsFunction(this, 'TranslateItemFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../src/translate-item.ts'),
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

    // API Gateway
    const api = new apigateway.RestApi(this, 'GlobalProductCatalogApi', {
      restApiName: 'Global Product Catalog Service',
    });

    // API Key for Authorization
    const apiKey = api.addApiKey('ApiKey');
    const plan = api.addUsagePlan('UsagePlan', {
      name: 'Easy',
      apiKey,
    });
    plan.addApiStage({ stage: api.deploymentStage });

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
  }
}