import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as cr from 'aws-cdk-lib/custom-resources';
import { ProductApi } from './constructs/product-api';

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

    // Create Lambda layer for shared code
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../shared-layer')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Common utilities and types for product catalog application',
    });

    // Lambda Functions with shared layer
    const postItemLambda = new nodejs.NodejsFunction(this, 'PostItemFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambdas/post-item.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: productsTable.tableName,
      },
      bundling: {
        externalModules: [
          'aws-sdk',
        ],
      },
      layers: [sharedLayer],
    });

    const getItemLambda = new nodejs.NodejsFunction(this, 'GetItemFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambdas/get-item.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: productsTable.tableName,
      },
      bundling: {
        externalModules: [
          'aws-sdk',
        ],
      },
      layers: [sharedLayer],
    });

    const putItemLambda = new nodejs.NodejsFunction(this, 'PutItemFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambdas/put-item.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: productsTable.tableName,
      },
      bundling: {
        externalModules: [
          'aws-sdk',
        ],
      },
      layers: [sharedLayer],
    });

    const translateItemLambda = new nodejs.NodejsFunction(this, 'TranslateItemFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambdas/translate-item.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: productsTable.tableName,
      },
      bundling: {
        externalModules: [
          'aws-sdk',
        ],
      },
      layers: [sharedLayer],
    });

    // Grant permissions to Lambda functions
    productsTable.grantReadWriteData(postItemLambda);
    productsTable.grantReadWriteData(getItemLambda);
    productsTable.grantReadWriteData(putItemLambda);
    productsTable.grantReadWriteData(translateItemLambda);

    // Give translate lambda permission to use the translate service and comprehend for language detection
    translateItemLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'translate:TranslateText',
        'comprehend:DetectDominantLanguage'
      ],
      resources: ['*'],
    }));

    // Seed data function
    const seedFunction = new nodejs.NodejsFunction(this, 'SeedDataFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../seed/products.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: productsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });
    
    // Grant the seed function permission to write to the table
    productsTable.grantWriteData(seedFunction);
    
    // Create a custom resource provider to trigger seeding
    const seedingProvider = new cr.Provider(this, 'SeedingProvider', {
      onEventHandler: seedFunction,
      logRetention: cdk.aws_logs.RetentionDays.ONE_DAY,
    });

    // Create a custom resource that will trigger the seeding
    const seeder = new cdk.CustomResource(this, 'TableSeeder', {
      serviceToken: seedingProvider.serviceToken,
      properties: {
        tableName: productsTable.tableName,
        // This ensures it runs on every deploy
        timestamp: Date.now().toString(),
      },
    });

    // Create the custom API construct
    const productApi = new ProductApi(this, 'ProductApi', {
      getItemFunction: getItemLambda,
      postItemFunction: postItemLambda,
      putItemFunction: putItemLambda,
      translateItemFunction: translateItemLambda
    });
    
    // Stack outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: productApi.api.url,
      description: 'The URL of the API Gateway',
    });
    
    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: productApi.apiKey.keyId,
      description: 'The ID of the API Key. Use "aws apigateway get-api-key --api-key [THIS_VALUE] --include-value" to get the value',
    });
  }
}