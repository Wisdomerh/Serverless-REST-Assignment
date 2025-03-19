import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { APIGatewayProxyHandler } from 'aws-lambda';

const dynamoClient = new DynamoDBClient({});
const translateClient = new TranslateClient({});
const tableName = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const category = event.pathParameters?.category;
    const productId = event.pathParameters?.productId;
    const language = event.queryStringParameters?.language;

    if (!category || !productId || !language) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields' }),
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

    const description = item.description.S;
    const translationKey = `${category}#${productId}#${language}`;

    // Check if translation is cached
    const cachedTranslation = item.translations?.M?.[language]?.S;
    if (cachedTranslation) {
      return {
        statusCode: 200,
        body: JSON.stringify({ description: cachedTranslation }),
      };
    }

    // Translate text
    const translateCommand = new TranslateTextCommand({
      Text: description,
      SourceLanguageCode: 'en',
      TargetLanguageCode: language,
    });

    const translationResult = await translateClient.send(translateCommand);
    const translatedText = translationResult.TranslatedText;

    // Cache translation
    const putCommand = new PutItemCommand({
      TableName: tableName,
      Item: {
        category: { S: category },
        productId: { S: productId },
        [`translations.${language}`]: { S: translatedText },
      },
    });

    await dynamoClient.send(putCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ description: translatedText }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error }),
    };
  }
};