import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
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
        headers: {
          'Content-Type': 'application/json'
        },
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
    
    // Convert DynamoDB items to regular JSON
    const items = result.Items ? result.Items.map(item => unmarshall(item)) : [];

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(items),
    };
  } catch (error) {
    console.error('Error retrieving items:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Internal server error', error: String(error) }),
    };
  }
};