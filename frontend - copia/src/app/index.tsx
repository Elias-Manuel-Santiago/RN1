import { Text, View, StyleSheet, TextInput } from 'react-native';
import { useState } from 'react';

export default function Index() {
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  return (
    <View style={styles.container}>
      <Text>Formulario</Text>
      <TextInput onChangeText={setNombre} />
      <TextInput onChangeText={setPassword} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
