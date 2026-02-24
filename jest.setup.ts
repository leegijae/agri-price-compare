// jest.setup.ts
// jest-native를 아직 설치 안 했으면 아래 줄은 주석 처리해도 됩니다.
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