
import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

// Placeholder for full Navigation implementation
// In a real app, this would use @react-navigation/native

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <View style={styles.content}>
        <Text style={styles.title}>YouNov Mobile</Text>
        <Text style={styles.subtitle}>Native reading experience coming soon.</Text>
        
        {/* Placeholder for Navigation Container */}
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>Navigation Stack</Text>
          <Text style={styles.routeItem}>• Home</Text>
          <Text style={styles.routeItem}>• Browse</Text>
          <Text style={styles.routeItem}>• Reader</Text>
          <Text style={styles.routeItem}>• Profile</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // slate-950
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8', // slate-400
    marginBottom: 40,
  },
  placeholderBox: {
    width: '100%',
    padding: 20,
    backgroundColor: '#0f172a', // slate-900
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b', // slate-800
  },
  placeholderText: {
    color: '#a855f7', // purple-500
    fontWeight: 'bold',
    marginBottom: 10,
  },
  routeItem: {
    color: '#e2e8f0', // slate-200
    fontSize: 14,
    marginVertical: 4,
  }
});

export default App;
