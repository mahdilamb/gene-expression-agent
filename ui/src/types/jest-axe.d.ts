// Ambient declaration for jest-axe which ships no TypeScript types.
// This file must remain a "script" (no top-level import/export) so that
// the declare module block is treated as an ambient module declaration.
declare module "jest-axe" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function axe(html: Element | string, options?: Record<string, unknown>): Promise<any>;
  // toHaveNoViolations is a matchers object passed to expect.extend(toHaveNoViolations)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const toHaveNoViolations: Record<string, (...args: any[]) => any>;
}
