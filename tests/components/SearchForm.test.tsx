import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SearchForm from '@/src/components/SearchForm';

function isDisabled(node: any) {
  return (
    node?.props?.accessibilityState?.disabled === true ||
    node?.props?.disabled === true
  );
}

describe('SearchForm', () => {
  const defaultProps = {
    date: '20151120',
    marketName: '서울강서도매시장',
    productName: '배추',
    loading: false,
    onChangeDate: jest.fn(),
    onChangeMarketName: jest.fn(),
    onChangeProductName: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('초기 입력값이 화면에 표시된다', () => {
    const { getByDisplayValue } = render(<SearchForm {...defaultProps} />);
    expect(getByDisplayValue('20151120')).toBeTruthy();
    expect(getByDisplayValue('서울강서도매시장')).toBeTruthy();
    expect(getByDisplayValue('배추')).toBeTruthy();
  });

  it('조회일자 입력 변경 시 onChangeDate가 호출된다', () => {
    const { getByTestId } = render(<SearchForm {...defaultProps} />);
    fireEvent.changeText(getByTestId('date-input'), '20151121');
    expect(defaultProps.onChangeDate).toHaveBeenCalledWith('20151121');
  });

  it('시장명 입력 변경 시 onChangeMarketName이 호출된다', () => {
    const { getByTestId } = render(<SearchForm {...defaultProps} />);
    fireEvent.changeText(getByTestId('market-input'), '부산엄궁도매시장');
    expect(defaultProps.onChangeMarketName).toHaveBeenCalledWith('부산엄궁도매시장');
  });

  it('품목명 입력 변경 시 onChangeProductName이 호출된다', () => {
    const { getByTestId } = render(<SearchForm {...defaultProps} />);
    fireEvent.changeText(getByTestId('product-input'), '무');
    expect(defaultProps.onChangeProductName).toHaveBeenCalledWith('무');
  });

  it('유효한 입력값이면 조회 버튼 클릭 시 onSubmit이 호출된다', () => {
    const { getByTestId } = render(<SearchForm {...defaultProps} />);
    fireEvent.press(getByTestId('search-button'));
    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('loading=true 이면 버튼이 비활성화되고 로딩 문구가 표시된다', () => {
    const { getByTestId, getByText } = render(
      <SearchForm {...defaultProps} loading={true} />
    );

    const button = getByTestId('search-button');
    expect(isDisabled(button)).toBe(true);
    expect(getByText('조회 중...')).toBeTruthy();
  });

  it('loading=false 이면 기본 버튼 문구를 표시한다', () => {
    const { getByText } = render(<SearchForm {...defaultProps} loading={false} />);
    expect(getByText('조회')).toBeTruthy();
  });

  it('버튼이 비활성화 상태면 onSubmit이 호출되지 않는다', () => {
    const onSubmit = jest.fn();

    const { getByTestId } = render(
      <SearchForm
        {...defaultProps}
        date=""
        marketName=""
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(getByTestId('search-button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});