import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';

const client = new DynamoDBClient({});
const tableName = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const category = event.pathParameters?.category;
    const filter = event.queryStringParameters?.filter;

    if (!category) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Category is required' }),
      };
    }

    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: {
        ':category': { S: category },
      },
      FilterExpression: filter ? 'contains(description, :filter)' : undefined,
      ExpressionAttributeValues: filter
        ? { ':category': { S: category }, ':filter': { S: filter } }
        : { ':category': { S: category } },
    });

    const result = await client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify(result.Items || []),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error }),
    };
  }
};