import { Handler } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME;

export const handler: Handler = async (event, context) => {
  try {
    console.log("Get all movies function invoked");

    const command = new ScanCommand({
      TableName: tableName,
    });

    const response = await ddbDocClient.send(command);

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      },
      body: JSON.stringify({
        data: response.Items,
      }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      },
      body: JSON.stringify({ error: "Failed to retrieve movies" }),
    };
  }
};