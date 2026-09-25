import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeProvider';
import { legalDocument, LegalDocKey } from '../../src/legal/shotra-legal';

/** Visor de Términos / Autorización de datos (accesible sin sesión, desde el registro). */
export default function LegalScreen() {
  const { theme } = useTheme();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const document = legalDocument((doc === 'habeasData' ? 'habeasData' : 'terms') as LegalDocKey);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(auth)/register'));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.back} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>{document.title}</Text>
          <Text style={[styles.version, { color: theme.textMuted }]}>Versión {document.version}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: theme.text }]}>{document.intro}</Text>
        {document.sections.map((sec) => (
          <View key={sec.heading} style={styles.section}>
            <Text style={[styles.heading, { color: theme.text }]}>{sec.heading}</Text>
            {sec.paragraphs?.map((p, i) => (
              <Text key={`p${i}`} style={[styles.paragraph, { color: theme.textMuted }]}>{p}</Text>
            ))}
            {sec.items?.map((item, i) => (
              <View key={`i${i}`} style={styles.item}>
                <Text style={[styles.bullet, { color: theme.accent }]}>•</Text>
                <Text style={[styles.paragraph, styles.itemText, { color: theme.textMuted }]}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <TouchableOpacity style={[styles.button, { backgroundColor: theme.accent }]} onPress={goBack}>
          <Text style={[styles.buttonText, { color: theme.accentText }]}>Entendido</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 52, paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { padding: 4 },
  title: { fontSize: 18, fontWeight: '900' },
  version: { fontSize: 12, marginTop: 2 },
  content: { padding: 20, paddingBottom: 48 },
  intro: { fontSize: 15, lineHeight: 22, fontWeight: '600', marginBottom: 8 },
  section: { marginTop: 18 },
  heading: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
  paragraph: { fontSize: 14, lineHeight: 21 },
  item: { flexDirection: 'row', gap: 8, marginTop: 6 },
  bullet: { fontSize: 14, lineHeight: 21, fontWeight: '900' },
  itemText: { flex: 1 },
  button: { marginTop: 28, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '800' },
});
