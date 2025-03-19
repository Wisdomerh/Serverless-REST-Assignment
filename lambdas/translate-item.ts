import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const dynamoClient = new DynamoDBClient({});
const translateClient = new TranslateClient({});
const tableName = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const category = event.pathParameters?.category;
    const productId = event.pathParameters?.productId;
    const language = event.queryStringParameters?.language || 'fr'; // Default to French

    if (!category || !productId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required path parameters' }),
      };
    }

    // Check if translation exists
    const getCommand = new GetItemCommand({
      TableName: tableName,
      Key: {
        category: { S: category },
        productId: { S: productId },
      },
    });

    const result = await dynamoClient.send(getCommand);
    const item = result.Item;

    if (!item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Item not found' }),
      };
    }

    const description = item.description?.S;
    if (!description) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Item has no description to translate' }),
      };
    }

    const translationKey = `${category}#${productId}#${language}`;

    // Check if translation is cached
    const translations = item.translations?.M;
    const cachedTranslation = translations?.[language]?.S;
    
    if (cachedTranslation) {
      console.log(`Using cached translation for ${translationKey}`);
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          original: description,
          translated: cachedTranslation,
          language,
          cached: true
        }),
      };
    }

    console.log(`Translating text to ${language}: "${description}"`);
    
    // Translate text
    const translateCommand = new TranslateTextCommand({
      Text: description,
      SourceLanguageCode: 'auto', // Auto-detect source language
      TargetLanguageCode: language,
    });

    const translationResult = await translateClient.send(translateCommand);
    const translatedText = translationResult.TranslatedText;

    if (!translatedText) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Translation failed' }),
      };
    }

    // Cache translation in DynamoDB
    const translationsAttribute = item.translations?.M || {};
    translationsAttribute[language] = { S: translatedText };

    const updateCommand = new UpdateItemCommand({
      TableName: tableName,
      Key: {
        category: { S: category },
        productId: { S: productId },
      },
      UpdateExpression: 'SET translations = :translations',
      ExpressionAttributeValues: {
        ':translations': { M: translationsAttribute },
      },
    });

    await dynamoClient.send(updateCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        original: description,
        translated: translatedText,
        language,
        cached: false
      }),
    };
  } catch (error) {
    console.error('Error translating item:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: String(error) }),
    };
  }
};