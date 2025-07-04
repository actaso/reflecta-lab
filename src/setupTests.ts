import '@testing-library/jest-dom';

// Mock PostHog
jest.mock('posthog-js/react', () => ({
  usePostHog: jest.fn(() => ({
    capture: jest.fn(),
    identify: jest.fn(),
    init: jest.fn(),
  })),
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('posthog-js', () => ({
  init: jest.fn(),
  capture: jest.fn(),
  identify: jest.fn(),
}));

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(() => ({ user: null, isLoaded: true })),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));


// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
});

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 120,
  height: 40,
  top: 0,
  left: 0,
  bottom: 40,
  right: 120,
  x: 0,
  y: 0,
  toJSON: jest.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});