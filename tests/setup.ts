import '@testing-library/jest-dom/vitest';

if (typeof document !== 'undefined' && !document.elementFromPoint) {
  document.elementFromPoint = () => null;
}

globalThis.ResizeObserver = class ResizeObserver {
  private callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    queueMicrotask(() => {
      this.callback(
        [
          {
            target,
            contentRect: {
              x: 0,
              y: 0,
              width: 600,
              height: 400,
              top: 0,
              bottom: 400,
              left: 0,
              right: 600,
              toJSON: () => {},
            },
          } as unknown as ResizeObserverEntry,
        ],
        this,
      );
    });
  }
  unobserve() {}
  disconnect() {}
};
