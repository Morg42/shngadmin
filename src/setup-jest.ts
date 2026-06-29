import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
setupZoneTestEnv();

// jsdom doesn't implement structuredClone, unlike real browsers and Node itself —
// code under test (e.g. ItemTreeComponent.filterNodes()) relies on it being global.
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (value: unknown) => JSON.parse(JSON.stringify(value));
}
