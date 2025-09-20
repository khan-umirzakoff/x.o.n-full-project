// Global types for external scripts loaded via index.html
// This makes window.Guacamole available for TypeScript without importing a module.
// If the script is missing at runtime, related features should noop gracefully.
declare global {
  interface Window {
    Guacamole?: {
      Keyboard: new (element: any) => {
        onkeydown: ((keysym: number) => void) | null;
        onkeyup: ((keysym: number) => void) | null;
        reset: () => void;
      };
    };
  }
}

export {};