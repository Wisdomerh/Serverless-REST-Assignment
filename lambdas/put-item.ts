import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { formatResponse, handleError } from '../shared-layer';

const client = new DynamoDBClient({});
const tableName = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // Check for API key
    const apiKey = event.headers['x-api-key'];
    console.log('API Key present:', !!apiKey);
    
    const category = event.pathParameters?.category;
    const productId = event.pathParameters?.productId;
    
    if (!category || !productId) {
      return formatResponse(400, { message: 'Category and productId are required' });
    }
    
    if (!event.body) {
      return formatResponse(400, { message: 'Request body is required' });
    }

    const body = JSON.parse(event.body);
    const { description, price, name, inStock } = body;

    // Ensure at least one field to update is provided
    if (!description && price === undefined && name === undefined && inStock === undefined) {
      return formatResponse(400, { message: 'At least one field to update must be provided' });
    }

    const updateExpressionParts: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Add updated timestamp
    updateExpressionParts.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = { S: new Date().toISOString() };

    if (description) {
      updateExpressionParts.push('#desc = :description');
      expressionAttributeNames['#desc'] = 'description';
      expressionAttributeValues[':description'] = { S: description };
    }

    if (price !== undefined) {
      updateExpressionParts.push('#price = :price');
      expressionAttributeNames['#price'] = 'price';
      expressionAttributeValues[':price'] = { N: price.toString() };
    }

    if (name !== undefined) {
      updateExpressionParts.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = { S: name };
    }

    if (inStock !== undefined) {
      updateExpressionParts.push('#inStock = :inStock');
      expressionAttributeNames['#inStock'] = 'inStock';
      expressionAttributeValues[':inStock'] = { BOOL: inStock };
    }

    const command = new UpdateItemCommand({
      TableName: tableName,
      Key: {
        category: { S: category },
        productId: { S: productId },
      },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const result = await client.send(command);
    console.log(`Updated product: ${category}/${productId}`);

    return formatResponse(200, { 
      message: 'Item updated successfully',
      item: result.Attributes
    });
  } catch (error) {
    console.error('Error updating item:', error);
    return handleError(error);
  }
};