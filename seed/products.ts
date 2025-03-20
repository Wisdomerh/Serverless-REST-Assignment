import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Product } from '../shared/types';

// Initialize DynamoDB document client
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// Sample product data
export const sampleProducts: Product[] = [
  {
    category: 'electronics',
    productId: 'e1001',
    name: 'Smartphone X',
    price: 799.99,
    description: 'Latest smartphone with cutting-edge features and high-resolution camera',
    inStock: true
  },
  {
    category: 'electronics',
    productId: 'e1002',
    name: 'Laptop Pro',
    price: 1299.99,
    description: 'Professional laptop with high performance for developers and designers',
    inStock: true
  },
  {
    category: 'books',
    productId: 'b1001',
    name: 'Cloud Computing Explained',
    price: 34.99,
    description: 'A comprehensive guide to modern cloud computing architecture and practices',
    inStock: true
  },
  {
    category: 'books',
    productId: 'b1002',
    name: 'Distributed Systems Design',
    price: 42.99,
    description: 'Learn how to design scalable and resilient distributed systems',
    inStock: false
  },
  {
    category: 'clothing',
    productId: 'c1001',
    name: 'Winter Jacket',
    price: 89.99,
    description: 'Warm and comfortable jacket for cold winter days',
    inStock: true
  }
];

// Function to seed the DynamoDB table
export async function seedData(): Promise<void> {
  // Get the table name from the environment variable
  const tableName = process.env.TABLE_NAME;
  
  if (!tableName) {
    throw new Error('TABLE_NAME environment variable is not set');
  }
  
  console.log(`Seeding data to table: ${tableName}`);
  
  // Add each product to the table
  for (const product of sampleProducts) {
    try {
      await ddbDocClient.send(
        new PutCommand({
          TableName: tableName,
          Item: product
        })
      );
      console.log(`Added product: ${product.category}/${product.productId}`);
    } catch (error) {
      console.error(`Error adding product ${product.category}/${product.productId}:`, error);
      throw error;
    }
  }
  
  console.log('Seeding completed successfully');
  return;
}

// Lambda handler for custom resource
export async function handler(event: any): Promise<any> {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  if (event.RequestType === 'Delete') {
    return {
      PhysicalResourceId: event.PhysicalResourceId,
      Status: 'SUCCESS'
    };
  }
  
  try {
    await seedData();
    return {
      PhysicalResourceId: `seed-data-${Date.now()}`,
      Status: 'SUCCESS'
    };
  } catch (error) {
    console.error('Error in handler:', error);
    return {
      PhysicalResourceId: `seed-data-${Date.now()}`,
      Status: 'FAILED',
      Reason: String(error)
    };
  }
}