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
    productName: '배추',
    loading: false,
    region: '전체',
    onChangeProductName: jest.fn(),
    onChangeRegion: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('초기 품목명이 입력창에 표시된다', () => {
    const { getByDisplayValue } = render(<SearchForm {...defaultProps} />);
    expect(getByDisplayValue('배추')).toBeTruthy();
  });

  it('region이 전체이면 전체 기준 안내 문구를 표시한다', () => {
    const { getByText } = render(
      <SearchForm {...defaultProps} region="전체" />
    );

    expect(
      getByText('전체 지역 기준으로 최근 60일 내 거래 데이터를 조회합니다.')
    ).toBeTruthy();
  });

  it('region이 전체가 아니면 선택 지역 안내 문구를 표시한다', () => {
    const { getByText } = render(
      <SearchForm {...defaultProps} region="서울" />
    );

    expect(getByText('선택 지역: 서울 · 최근 60일 기준')).toBeTruthy();
  });

  it('품목명 입력 변경 시 onChangeProductName이 호출된다', () => {
    const { getByTestId } = render(<SearchForm {...defaultProps} />);
    fireEvent.changeText(getByTestId('product-input'), '무');
    expect(defaultProps.onChangeProductName).toHaveBeenCalledWith('무');
  });

  it('지역 칩 클릭 시 onChangeRegion이 호출된다', () => {
    const { getByText } = render(<SearchForm {...defaultProps} />);
    fireEvent.press(getByText('서울'));
    expect(defaultProps.onChangeRegion).toHaveBeenCalledWith('서울');
  });

  it('조회 버튼 클릭 시 onSubmit이 호출된다', () => {
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
    const { getByText } = render(
      <SearchForm {...defaultProps} loading={false} />
    );
    expect(getByText('조회')).toBeTruthy();
  });

  it('loading=true 상태에서는 버튼 press가 무시된다', () => {
    const onSubmit = jest.fn();

    const { getByTestId } = render(
      <SearchForm
        {...defaultProps}
        loading={true}
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(getByTestId('search-button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});