import { marshall } from "@aws-sdk/util-dynamodb";
import { APIGatewayProxyResult } from 'aws-lambda';
import { Product } from './types';

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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
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
  return formatResponse(500, { message: 'Internal server error', error: String(error) });
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

/**
 * Creates a unique key for translation caching
 */
export function createTranslationKey(text: string, language: string): string {
  // Simple hash function for demo purposes
  return `${Buffer.from(text).toString('base64')}_${language}`;
}

/**
 * Check if a string contains only letters and basic punctuation
 * Used to validate language codes
 */
export function isValidLanguageCode(code: string): boolean {
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(code);
}

/**
 * Helper function to generate DynamoDB PutRequest items
 */
export const generateItem = (entity: Product) => {
  return {
    PutRequest: {
      Item: marshall(entity),
    },
  };
};

/**
 * Helper function to generate a batch of PutRequest items
 */
export const generateBatch = (data: Product[]) => {
  return data.map((e) => {
    return generateItem(e);
  });
};