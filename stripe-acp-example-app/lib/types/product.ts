/**
 * Product and Product Feed type definitions for ACP Product Feed Spec
 */

/**
 * Represents a single product in the catalog
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  category?: string;
}

/**
 * Response format for product feed API
 */
export interface ProductFeedResponse {
  products: Product[];
  total: number;
}
