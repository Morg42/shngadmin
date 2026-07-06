import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
setupZoneTestEnv();

// jsdom doesn't implement structuredClone, unlike real browsers and Node itself —
// code under test (e.g. ItemTreeComponent.filterNodes()) relies on it being global.
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (value: unknown) => JSON.parse(JSON.stringify(value));
}

// jsdom doesn't implement matchMedia at all — ThemeService uses it to detect
// and react to the OS's prefers-color-scheme, and is injected widely enough
// (top-navigation, code-editor) that most component specs would otherwise
// throw "matchMedia is not a function" on construction.
if (typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
}
