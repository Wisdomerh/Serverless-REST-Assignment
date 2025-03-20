import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { formatResponse, handleError } from '../shared-layer';

const client = new DynamoDBClient({});
const tableName = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const category = event.pathParameters?.category;
    const filter = event.queryStringParameters?.filter;

    if (!category) {
      return formatResponse(400, { message: 'Category is required' });
    }

    console.log(`Retrieving products for category: ${category}`);

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
      console.log(`Added filter: ${filter}`);
    }

    console.log('Query params:', JSON.stringify(params, null, 2));
    
    const command = new QueryCommand(params);
    const result = await client.send(command);
    
    console.log('Query result count:', result.Count);
    
    // Convert DynamoDB items to regular JSON
    const items = result.Items ? result.Items.map(item => unmarshall(item)) : [];

    return formatResponse(200, items);
  } catch (error) {
    console.error('Error retrieving items:', error);
    return handleError(error);
  }
};