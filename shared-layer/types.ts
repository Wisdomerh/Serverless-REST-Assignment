export interface Product {
    category: string;
    productId: string;
    name?: string; 
    description: string;
    price: number;
    inStock: boolean; 
    translations?: {
      [language: string]: string; 
    };
    updatedAt?: string; 
  }
  

  export interface ApiResponse {
    statusCode: number;
    headers: {
      [key: string]: string;
    };
    body: string;
  }