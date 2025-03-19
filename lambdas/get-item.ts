import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const tableName = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const category = event.pathParameters?.category;
    const filter = event.queryStringParameters?.filter;

    if (!category) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Category is required' }),
      };
    }

    const params: any = {
      TableName: tableName,
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: {
        ':category': { S: category },
      }
    };

    // Add filter if provided
    if (filter) {
      params.FilterExpression = 'contains(description, :filter)';
      params.ExpressionAttributeValues[':filter'] = { S: filter };
    }

    const command = new QueryCommand(params);
    const result = await client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify(result.Items || []),
    };
  } catch (error) {
    console.error('Error retrieving items:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: String(error) }),
    };
  }
};