import React from 'react';
import { Drawer } from 'expo-router/drawer';

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        drawerType: 'front',
      }}
    >
      <Drawer.Screen
        name="market"
        options={{
          title: '도매시장 조회',
          drawerLabel: '도매시장 조회',
        }}
      />
      <Drawer.Screen
        name="graph"
        options={{
          title: '가격 변동 그래프',
          drawerLabel: '가격 변동 그래프',
        }}
      />
    </Drawer>
  );
}