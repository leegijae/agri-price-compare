// jest.setup.ts
import '@testing-library/jest-native/extend-expect';

// Expo Router mock (초기 템플릿 테스트 안정화용)
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: any) => children,
}));

// Reanimated mock (필요 시)
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

// expo-constants mock (필요 시)
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

// console error noisy suppress (선택)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    const msg = String(args[0] ?? '');
    if (
      msg.includes('Warning: An update to') ||
      msg.includes('act(...)')
    ) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});