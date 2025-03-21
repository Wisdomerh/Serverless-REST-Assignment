export interface Product {
  category: string;
  productId: string;
  name?: string;
  description: string;
  price: number;
  inStock: boolean;
  translations?: Record<string, string>;
  updatedAt?: string;
}

export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface TranslationRecord {
  translationKey: string;
  language: string;
  originalText: string;
  translatedText: string;
}