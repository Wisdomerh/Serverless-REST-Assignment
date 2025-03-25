import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { formatResponse, handleError, validateFields } from '../shared-layer';

const client = new DynamoDBClient({});
const tableName = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // Check for API key
    const apiKey = event.headers['x-api-key'];
    console.log('API Key present:', !!apiKey);
    
    if (!event.body) {
      return formatResponse(400, { message: 'Request body is required' });
    }

    const body = JSON.parse(event.body);
    
    // Validate required fields
    const missingFields = validateFields(body, ['category', 'productId', 'description', 'price']);
    if (missingFields.length > 0) {
      return formatResponse(400, { 
        message: 'Missing required fields', 
        missingFields 
      });
    }

    const { category, productId, name, description, price } = body;

    const command = new PutItemCommand({
      TableName: tableName,
      Item: {
        category: { S: category },
        productId: { S: productId },
        name: { S: name || productId },
        description: { S: description },
        price: { N: price.toString() },
        inStock: { BOOL: body.inStock ?? true },
        updatedAt: { S: new Date().toISOString() }
      },
    });

    await client.send(command);
    console.log(`Created product: ${category}/${productId}`);

    return formatResponse(201, { 
      message: 'Item created successfully',
      item: { 
        category, 
        productId, 
        name: name || productId, 
        description, 
        price, 
        inStock: body.inStock ?? true 
      }
    });
  } catch (error) {
    console.error('Error creating item:', error);
    return handleError(error);
  }
};