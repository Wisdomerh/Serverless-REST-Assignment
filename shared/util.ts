import { marshall } from "@aws-sdk/util-dynamodb";
import { Movie, MovieCast } from "./types";
import { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Helper function to format API Gateway responses.
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @returns APIGatewayProxyResult
 */
export const formatResponse = (statusCode: number, body: object): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
};

/**
 * Helper function to handle errors and return a formatted response.
 * @param error - Error object
 * @returns APIGatewayProxyResult
 */
export const handleError = (error: unknown): APIGatewayProxyResult => {
  console.error('Error:', error);
  return formatResponse(500, { message: 'Internal server error', error });
};

/**
 * Helper function to validate required fields in a request body.
 * @param body - Parsed request body
 * @param requiredFields - Array of required field names
 * @returns Array of missing fields
 */
export const validateFields = (body: Record<string, any>, requiredFields: string[]): string[] => {
  return requiredFields.filter((field) => !body[field]);
};

type Entity = Movie | MovieCast;  // NEW
export const generateItem = (entity: Entity) => {
  return {
    PutRequest: {
      Item: marshall(entity),
 },
 };
};

export const generateBatch = (data: Entity[]) => {
  return data.map((e) => {
    return generateItem(e);
 });
};
