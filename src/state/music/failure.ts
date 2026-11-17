/**
 * The message shown when something fails: "prefix: reason" when the error
 * says why, or the fallback sentence otherwise.
 */
export function describeFailure(
  error: unknown,
  prefix: string,
  fallback: string,
): string {
  return error instanceof Error ? `${prefix}: ${error.message}` : fallback;
}
