/**
 * @file lib/xml-utils.ts
 * @description XML utility functions for escaping and formatting
 */

/**
 * Escape XML special characters
 * @param text - Text to escape
 * @returns Escaped XML-safe text
 */
export function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

/**
 * Generate XML declaration
 * @returns Standard XML declaration
 */
export function xmlDeclaration(): string {
  return '<?xml version="1.0" encoding="UTF-8"?>'
}
