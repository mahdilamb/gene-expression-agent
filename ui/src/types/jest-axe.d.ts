// Ambient declaration for jest-axe which ships no TypeScript types.
// This file must remain a "script" (no top-level import/export) so that
// the declare module block is treated as an ambient module declaration.
declare module "jest-axe" {
  export function axe(html: Element | string, options?: Record<string, unknown>): Promise<any>;
  // toHaveNoViolations is a matchers object passed to expect.extend(toHaveNoViolations)
  export const toHaveNoViolations: Record<string, (...args: any[]) => any>;
}
