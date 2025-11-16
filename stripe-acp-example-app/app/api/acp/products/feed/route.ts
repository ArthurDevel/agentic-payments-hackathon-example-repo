/**
 * API Route: Product Feed (ACP Product Feed Spec)
 *
 * Responsibilities:
 * - Returns list of available products
 * - Supports optional query parameter for filtering
 * - Implements ACP Product Feed specification
 */

import { NextRequest, NextResponse } from 'next/server';
import { Product, ProductFeedResponse } from '@/lib/types/product';
import productsData from '@/data/products.json';

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

/**
 * GET handler for product feed
 * @param request - Next.js request object with optional query parameter
 * @returns JSON response with products matching the query
 */
export async function GET(request: NextRequest): Promise<NextResponse<ProductFeedResponse>> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.toLowerCase();

  const products = productsData as Product[];

  const filteredProducts = query
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query)
      )
    : products;

  return NextResponse.json({
    products: filteredProducts,
    total: filteredProducts.length,
  });
}
