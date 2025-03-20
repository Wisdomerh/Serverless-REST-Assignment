import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const tableName = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Check for API key (will be implemented later for authorization)
    const apiKey = event.headers['x-api-key'];
    
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Request body is required' }),
      };
    }

    const body = JSON.parse(event.body);
    const { category, productId, name, description, price } = body;

    if (!category || !productId || !description || !price) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Missing required fields' }),
      };
    }

    const command = new PutItemCommand({
      TableName: tableName,
      Item: {
        category: { S: category },
        productId: { S: productId },
        name: { S: name || productId }, // Use name or default to productId
        description: { S: description },
        price: { N: price.toString() },
        inStock: { BOOL: body.inStock ?? true }
      },
    });

    await client.send(command);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: 'Item created successfully',
        item: { category, productId, name: name || productId, description, price, inStock: body.inStock ?? true }
      }),
    };
  } catch (error) {
    console.error('Error creating item:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Internal server error', error: String(error) }),
    };
  }
};