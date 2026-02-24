import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';

type Props = {
  date: string;
  marketName: string;
  productName: string;
  loading?: boolean;
  onChangeDate: (v: string) => void;
  onChangeMarketName: (v: string) => void;
  onChangeProductName: (v: string) => void;
  onSubmit: () => void;
};

export default function SearchForm({
  date,
  marketName,
  productName,
  loading = false,
  onChangeDate,
  onChangeMarketName,
  onChangeProductName,
  onSubmit,
}: Props) {
  const isValid = date.trim().length > 0 && marketName.trim().length > 0;
  const disabled = !isValid || loading;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>도매시장 가격 조회</Text>

      <TextInput
        testID="date-input"
        style={styles.input}
        placeholder="조회일자 (예: 20260224)"
        value={date}
        onChangeText={onChangeDate}
      />

      <TextInput
        testID="market-input"
        style={styles.input}
        placeholder="시장명 (예: 서울강서도매시장)"
        value={marketName}
        onChangeText={onChangeMarketName}
      />

      <TextInput
        testID="product-input"
        style={styles.input}
        placeholder="품목명 (예: 배추)"
        value={productName}
        onChangeText={onChangeProductName}
      />

      <Pressable
        testID="search-button"
        accessibilityRole="button"
        onPress={onSubmit}
        disabled={disabled}
        style={[styles.button, disabled && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>
          {loading ? '조회 중...' : '조회'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: '#222',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});