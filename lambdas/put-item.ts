import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';

const client = new DynamoDBClient({});
const tableName = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const category = event.pathParameters?.category;
    const productId = event.pathParameters?.productId;
    const body = JSON.parse(event.body || '{}');
    const { description, price } = body;

    if (!category || !productId || (!description && !price)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields' }),
      };
    }

    const updateExpression = [];
    const expressionAttributeValues: Record<string, any> = {};

    if (description) {
      updateExpression.push('description = :description');
      expressionAttributeValues[':description'] = { S: description };
    }

    if (price) {
      updateExpression.push('price = :price');
      expressionAttributeValues[':price'] = { N: price.toString() };
    }

    const command = new UpdateItemCommand({
      TableName: tableName,
      Key: {
        category: { S: category },
        productId: { S: productId },
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Item updated successfully' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error }),
    };
  }
};