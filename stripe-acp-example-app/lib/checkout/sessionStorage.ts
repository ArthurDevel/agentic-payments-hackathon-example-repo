/**
 * Checkout Session Storage Utilities
 *
 * Responsibilities:
 * - Read and write checkout sessions to file storage
 * - Provide shared storage interface for all checkout endpoints
 */

import fs from 'fs';
import path from 'path';
import { CheckoutSession } from '@/lib/types/checkout';

// ============================================================================
// CONSTANTS
// ============================================================================

const SESSIONS_FILE_PATH = path.join(
  process.cwd(),
  'conversations',
  'checkout_sessions.json'
);

// ============================================================================
// STORAGE FUNCTIONS
// ============================================================================

/**
 * Reads checkout sessions from file storage
 * @returns Map of checkout sessions keyed by session ID
 */
export function readSessionsFromFile(): Map<string, CheckoutSession> {
  try {
    if (fs.existsSync(SESSIONS_FILE_PATH)) {
      const fileContent = fs.readFileSync(SESSIONS_FILE_PATH, 'utf-8');
      if (fileContent) {
        const data = JSON.parse(fileContent);
        return new Map(data);
      }
    }
  } catch (error) {
    console.error('Error reading checkout sessions file:', error);
  }
  return new Map<string, CheckoutSession>();
}

/**
 * Writes checkout sessions to file storage
 * @param sessions - Map of checkout sessions to persist
 */
export function writeSessionsToFile(sessions: Map<string, CheckoutSession>): void {
  try {
    const data = JSON.stringify(Array.from(sessions.entries()), null, 2);
    fs.writeFileSync(SESSIONS_FILE_PATH, data, 'utf-8');
  } catch (error) {
    console.error('Error writing checkout sessions file:', error);
  }
}

