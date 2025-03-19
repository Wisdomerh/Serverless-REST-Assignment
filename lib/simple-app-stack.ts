import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';b/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';rces";
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';nstructs';
import { movies, movieCasts } from "../seed/movies";
export class GlobalProductCatalogStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);constructor(scope: Construct, id: string, props?: cdk.StackProps) {

    // DynamoDB Table
    const productsTable = new dynamodb.Table(this, 'ProductsTable', {    const simpleFn = new lambdanode.NodejsFunction(this, "SimpleFn", {
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },rchitecture.ARM_64,
      sortKey: { name: 'productId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Use RETAIN in production
    });

    // Add GSI for translations
    productsTable.addGlobalSecondaryIndex({    const simpleFnURL = simpleFn.addFunctionUrl({
      indexName: 'TranslationIndex',,
      partitionKey: { name: 'translationKey', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'language', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Lambda Functionsst moviesTable = new dynamodb.Table(this, "MoviesTable", {
    const postItemLambda = new nodejs.NodejsFunction(this, 'PostItemFunction', {      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      runtime: lambda.Runtime.NODEJS_18_X,e: "id", type: dynamodb.AttributeType.NUMBER },
      entry: path.join(__dirname, '../src/post-item.ts'),DESTROY,
      handler: 'handler',
      environment: {
        TABLE_NAME: productsTable.tableName,
      },const movieCastsTable = new dynamodb.Table(this, "MovieCastTable", {
    });BillingMode.PAY_PER_REQUEST,
odb.AttributeType.NUMBER },
    const getItemLambda = new nodejs.NodejsFunction(this, 'GetItemFunction', {dynamodb.AttributeType.STRING },
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../src/get-item.ts'),ableName: "MovieCast",
      handler: 'handler',;
      environment: {




























































}  }    translation.addMethod('GET', new apigateway.LambdaIntegration(translateItemLambda));    const translation = productItem.addResource('translation');    });      apiKeyRequired: true,    productItem.addMethod('PUT', new apigateway.LambdaIntegration(putItemLambda), {    const productItem = product.addResource('{productId}');    product.addMethod('GET', new apigateway.LambdaIntegration(getItemLambda));    const product = products.addResource('{category}');    products.addMethod('GET', new apigateway.LambdaIntegration(getItemLambda));    });      apiKeyRequired: true,    products.addMethod('POST', new apigateway.LambdaIntegration(postItemLambda), {    const products = api.root.addResource('products');    // API Endpoints    plan.addApiStage({ stage: api.deploymentStage });    });      apiKey,      name: 'Easy',    const plan = api.addUsagePlan('UsagePlan', {    const apiKey = api.addApiKey('ApiKey');    // API Key for Authorization    });      restApiName: 'Global Product Catalog Service',    const api = new apigateway.RestApi(this, 'GlobalProductCatalogApi', {    // API Gateway    productsTable.grantReadWriteData(translateItemLambda);    productsTable.grantReadWriteData(putItemLambda);    productsTable.grantReadWriteData(getItemLambda);    productsTable.grantReadWriteData(postItemLambda);    // Grant permissions to Lambda functions    });      },        TABLE_NAME: productsTable.tableName,      environment: {      handler: 'handler',      entry: path.join(__dirname, '../src/translate-item.ts'),      runtime: lambda.Runtime.NODEJS_18_X,    const translateItemLambda = new nodejs.NodejsFunction(this, 'TranslateItemFunction', {    });      },        TABLE_NAME: productsTable.tableName,      environment: {      handler: 'handler',      entry: path.join(__dirname, '../src/put-item.ts'),      runtime: lambda.Runtime.NODEJS_18_X,    const putItemLambda = new nodejs.NodejsFunction(this, 'PutItemFunction', {    });      },        TABLE_NAME: productsTable.tableName,    movieCastsTable.addLocalSecondaryIndex({
      indexName: "roleIx",
      sortKey: { name: "roleName", type: dynamodb.AttributeType.STRING },
 });


    new custom.AwsCustomResource(this, "moviesddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [moviesTable.tableName]: generateBatch(movies),
            [movieCastsTable.tableName]: generateBatch(movieCasts),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("moviesddbInitData"), //.of(Date.now().toString()),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [moviesTable.tableArn],
      }),
    });

    const getMovieByIdFn = new lambdanode.NodejsFunction(
      this,
      "GetMovieByIdFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getMovieById.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: moviesTable.tableName,
          REGION: 'eu-west-1',
        },
      }
    );

    const getMovieByIdURL = getMovieByIdFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
      },
    });

    moviesTable.grantReadData(getMovieByIdFn);

    // Add getAllMovies function
    const getAllMoviesFn = new lambdanode.NodejsFunction(
      this,
      "GetAllMoviesFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getAllMovies.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: moviesTable.tableName,
          REGION: 'eu-west-1',
        },
      }
    );

    const getAllMoviesURL = getAllMoviesFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
      },
    });

const getMovieCastMembersFn = new lambdanode.NodejsFunction(
  this,
  "GetCastMemberFn",
{
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_18_X,
    entry: `${__dirname}/../lambdas/getMovieCastMembers.ts`,
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
      CAST_TABLE_NAME: movieCastsTable.tableName,
      REGION: "eu-west-1",
},
}
);

const getMovieCastMembersURL = getMovieCastMembersFn.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ["*"],
},
});    

    moviesTable.grantReadData(getAllMoviesFn);
    movieCastsTable.grantReadData(getMovieCastMembersFn);

    new cdk.CfnOutput(this, "Get Movie Cast Url", {
      value: getMovieCastMembersURL.url,
 });


    new cdk.CfnOutput(this, "Get Movie Function Url", { value: getMovieByIdURL.url });
    new cdk.CfnOutput(this, "Get All Movies Function Url", { value: getAllMoviesURL.url });
    new cdk.CfnOutput(this, "Simple Function Url", { value: simpleFnURL.url });
  }
}