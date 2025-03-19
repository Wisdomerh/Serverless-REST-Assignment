import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const tableName = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Check for API key (will be implemented later for authorization)
    const apiKey = event.headers['x-api-key'];
    
    const category = event.pathParameters?.category;
    const productId = event.pathParameters?.productId;
    
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body is required' }),
      };
    }

    const body = JSON.parse(event.body);
    const { description, price } = body;

    if (!category || !productId || (!description && !price)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields' }),
      };
    }

    const updateExpression: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};

    if (description) {
      updateExpression.push('description = :description');
      expressionAttributeValues[':description'] = { S: description };
    }

    if (price) {
      updateExpression.push('price = :price');
      expressionAttributeValues[':price'] = { N: price.toString() };
    }

    if (body.inStock !== undefined) {
      updateExpression.push('inStock = :inStock');
      expressionAttributeValues[':inStock'] = { BOOL: body.inStock };
    }

    const command = new UpdateItemCommand({
      TableName: tableName,
      Key: {
        category: { S: category },
        productId: { S: productId },
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const result = await client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Item updated successfully',
        attributes: result.Attributes
      }),
    };
  } catch (error) {
    console.error('Error updating item:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: String(error) }),
    };
  }
};