# Serverless REST Assignment - Distributed Systems

__Name:__ Wisdom Erhimwionsobo

__Demo:__ https://www.youtube.com/watch?v=sVETSWJmIvM

### Context

Context: Global Product Catalog

Table item attributes:
+ category - string (Partition key)
+ productId - string (Sort Key)
+ name - string
+ description - string
+ price - number
+ inStock - boolean
+ translations - Map<string, string>
+ updatedAt - string

### App API endpoints

+ POST /products - Add a new product (Protected with API Key)
+ GET /products/{category} - Get all products in a category
+ GET /products/{category}?filter=value - Filter products by description text
+ PUT /products/{category}/{productId} - Update a product (Protected with API Key)
+ GET /products/{category}/{productId}/translation?language=fr - Get product with description translated to specified language

### Features

#### Translation persistence

For translation persistence, I store translations directly in the product item as a map attribute. Each product in DynamoDB has a "translations" attribute which is a map where the keys are language codes (e.g., "fr", "es") and the values are the translated descriptions.

When a translation is requested for the first time, I use Amazon Translate to generate the translation and then store it in this map. On subsequent requests for the same language, I check if it already exists in the translations map and return it directly, avoiding unnecessary calls to the translation service.

Example item structure with translations:
+ category - "electronics"
+ productId - "e1001"
+ name - "Smartphone X"
+ description - "Latest smartphone with cutting-edge features"
+ price - 799.99
+ inStock - true
+ translations - { "fr": "Dernier smartphone avec des fonctionnalités de pointe", "es": "Último smartphone con características de vanguardia" }

#### Custom L2 Construct

My custom L2 construct encapsulates the API Gateway resources and configuration, including endpoints, API key, and usage plan.

Construct Input props object:
```typescript
interface ProductApiProps {
  getItemFunction: lambda.IFunction;
  postItemFunction: lambda.IFunction;
  putItemFunction: lambda.IFunction;
  translateItemFunction: lambda.IFunction;
}
```

Construct public properties:
```typescript
export class ProductApi extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly apiKey: apigateway.ApiKey;
}
```

#### Lambda Layers

I created a Lambda layer called SharedLayer that contains common code used by all of my Lambda functions. This includes:

1. Type definitions for my domain objects (Product, ApiResponse)
2. Utility functions for formatting responses, error handling, and field validation
3. Helper functions for translations and DynamoDB interactions

By using a Lambda layer, I removed code duplication across functions and made my application more maintainable. Each Lambda function imports these shared utilities from the layer.

#### API Keys

I implemented API key authentication to protect the POST and PUT endpoints that modify data, while keeping the GET endpoints publicly accessible. 

The implementation involves:

1. Creating an API key in API Gateway:
```typescript
this.apiKey = new apigateway.ApiKey(this, 'ApiKey', {
  apiKeyName: `product-api-key-${Date.now()}`,
  enabled: true,
});
```

2. Creating a usage plan and associating it with the API key:
```typescript
const plan = new apigateway.UsagePlan(this, 'UsagePlan', {
  name: 'Standard',
  throttle: {
    rateLimit: 10,
    burstLimit: 2,
  },
});

plan.addApiStage({
  stage: this.api.deploymentStage,
});
plan.addApiKey(this.apiKey);
```

3. Requiring the API key for specific endpoints:
```typescript
products.addMethod('POST', new apigateway.LambdaIntegration(props.postItemFunction), {
  apiKeyRequired: true,
});

productItem.addMethod('PUT', new apigateway.LambdaIntegration(props.putItemFunction), {
  apiKeyRequired: true,
});
```

When making requests to these protected endpoints, clients must include the API key in the `x-api-key` header.

### Extra

I added additional features to enhance the solution:
- Enhanced error handling with standardised error responses
- CORS support for cross-origin requests
- Input validation for all endpoints to ensure data integrity
