// Module augmentation to add jest-axe matchers to vitest's Assertion type.
import "vitest";

declare module "vitest" {
  interface Assertion {
    toHaveNoViolations(): void;
  }
}
