/**
 * Converts an institution or company name into a URL-friendly lowercase slug.
 */
export function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'organization'
  );
}
