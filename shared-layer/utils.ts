import { marshall } from "@aws-sdk/util-dynamodb";
import { Product } from "./types";
import { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Helper function to format API Gateway responses.
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @returns APIGatewayProxyResult
 */
export function formatResponse(statusCode: number, body: any): APIGatewayProxyResult {
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
}

/**
 * Helper function to handle errors and return a formatted response.
 * @param error - Error object
 * @returns APIGatewayProxyResult
 */
export function handleError(error: unknown): APIGatewayProxyResult {
  console.error('Error:', error);
  return formatResponse(500, { message: 'Internal server error', error: String(error) });
}

/**
 * Helper function to validate required fields in a request body.
 * @param body - Parsed request body
 * @param requiredFields - Array of required field names
 * @returns Array of missing fields
 */
export function validateFields(body: Record<string, any>, requiredFields: string[]): string[] {
  return requiredFields.filter((field) => !body[field]);
}

/**
 * Creates a unique key for translation caching
 * @param text - Text to translate
 * @param language - Target language code
 * @returns Unique key for the translation
 */
export function createTranslationKey(text: string, language: string): string {
  // Simple hash function for demo purposes
  // In production, use a more robust hashing algorithm
  return `${Buffer.from(text).toString('base64')}_${language}`;
}

/**
 * Check if a string contains only valid language code format
 * @param code - Language code to validate
 * @returns Boolean indicating if the code is valid
 */
export function isValidLanguageCode(code: string): boolean {
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(code);
}

/**
 * Helper function to generate DynamoDB PutRequest items
 * @param entity - The entity to convert to a DynamoDB item
 * @returns Formatted PutRequest object for DynamoDB
 */
export function generateItem(entity: Product) {
  return {
    PutRequest: {
      Item: marshall(entity),
    },
  };
}

/**
 * Helper function to generate a batch of PutRequest items
 * @param data - Array of entities to convert
 * @returns Array of PutRequest objects
 */
export function generateBatch(data: Product[]) {
  return data.map((e) => {
    return generateItem(e);
  });
}