import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useColors } from '@/hooks/useColors';

export const LoadingView = () => {
  const colors = useColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary + '15' }]}>
        <Text style={[styles.logoText, { color: colors.primary }]}>F</Text>
      </View>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Initializing Focus...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  logoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 14,
    letterSpacing: 1,
  },
});
