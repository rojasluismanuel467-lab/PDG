import "@testing-library/jest-dom/vitest";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Required by recharts responsive components in jsdom.

(globalThis as any).ResizeObserver = ResizeObserverMock;
