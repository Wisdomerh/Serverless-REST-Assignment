import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { formatResponse, handleError, isValidLanguageCode, createTranslationKey } from '../shared-layer';

const dynamoClient = new DynamoDBClient({});
const translateClient = new TranslateClient({});
const tableName = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const category = event.pathParameters?.category;
    const productId = event.pathParameters?.productId;
    const language = event.queryStringParameters?.language || 'fr'; // Default to French

    if (!category || !productId) {
      return formatResponse(400, { message: 'Category and productId are required' });
    }

    if (!isValidLanguageCode(language)) {
      return formatResponse(400, { 
        message: 'Invalid language code. Use ISO language codes like "fr", "es", "de", etc.' 
      });
    }

    console.log(`Getting product: ${category}/${productId} for translation to ${language}`);

    // Get the product from DynamoDB
    const getCommand = new GetItemCommand({
      TableName: tableName,
      Key: {
        category: { S: category },
        productId: { S: productId },
      },
    });

    const result = await dynamoClient.send(getCommand);
    
    if (!result.Item) {
      return formatResponse(404, { 
        message: 'Product not found',
        category,
        productId
      });
    }

    const item = unmarshall(result.Item);
    const description = item.description;
    
    if (!description) {
      return formatResponse(400, { message: 'Product has no description to translate' });
    }

    // Check if translation is already cached
    if (item.translations && item.translations[language]) {
      console.log(`Using cached translation for language: ${language}`);
      
      return formatResponse(200, {
        original: description,
        translated: item.translations[language],
        language,
        cached: true
      });
    }

    console.log(`Translating description: "${description}" to ${language}`);
    
    // Translate the description
    const translateCommand = new TranslateTextCommand({
      Text: description,
      SourceLanguageCode: 'auto', // Auto-detect source language
      TargetLanguageCode: language,
    });

    const translateResult = await translateClient.send(translateCommand);
    const translatedText = translateResult.TranslatedText;

    if (!translatedText) {
      return formatResponse(500, { message: 'Translation failed' });
    }

    console.log(`Translation result: "${translatedText}"`);

    // Cache the translation
    const translations = item.translations || {};
    translations[language] = translatedText;

    const updateCommand = new UpdateItemCommand({
      TableName: tableName,
      Key: {
        category: { S: category },
        productId: { S: productId },
      },
      UpdateExpression: 'SET translations = :translations',
      ExpressionAttributeValues: {
        ':translations': { 
          M: Object.entries(translations).reduce((acc, [key, value]) => {
            acc[key] = { S: value as string };
            return acc;
          }, {} as Record<string, any>)
        },
      },
    });

    await dynamoClient.send(updateCommand);
    console.log(`Cached translation for future use`);

    return formatResponse(200, {
      original: description,
      translated: translatedText,
      language,
      cached: false
    });
  } catch (error) {
    console.error('Error translating item:', error);
    return handleError(error);
  }
};