import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeProvider';

type DialogVariant = 'default' | 'success' | 'danger' | 'warning' | 'info';

interface DialogOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  showCancel?: boolean;
}

interface InternalState extends DialogOptions {
  visible: boolean;
  resolve?: (value: boolean) => void;
}

interface DialogApi {
  confirm: (opts: DialogOptions) => Promise<boolean>;
  alert: (opts: DialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogApi | null>(null);

// Referencia imperativa para poder llamar desde helpers fuera de componentes
let imperativeApi: DialogApi | null = null;

const VARIANT_META: Record<DialogVariant, { icon: any; color: string }> = {
  default: { icon: 'help-circle', color: '#4ecdc4' },
  success: { icon: 'checkmark-circle', color: '#2ecc71' },
  danger: { icon: 'alert-circle', color: '#e74c3c' },
  warning: { icon: 'warning', color: '#f39c12' },
  info: { icon: 'information-circle', color: '#3498db' },
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [state, setState] = useState<InternalState>({ visible: false, title: '' });

  const close = useCallback((result: boolean) => {
    setState((prev) => {
      prev.resolve?.(result);
      return { ...prev, visible: false, resolve: undefined };
    });
  }, []);

  const open = useCallback((opts: DialogOptions, showCancel: boolean) => {
    return new Promise<boolean>((resolve) => {
      setState({
        visible: true,
        showCancel,
        variant: 'default',
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        ...opts,
        resolve,
      });
    });
  }, []);

  const api: DialogApi = {
    confirm: (opts) => open(opts, opts.showCancel !== false),
    alert: (opts) => open({ ...opts, cancelText: undefined }, false),
  };
  imperativeApi = api;

  const meta = VARIANT_META[state.variant || 'default'];

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal visible={state.visible} transparent animationType="fade" onRequestClose={() => close(false)}>
        <Pressable style={styles.backdrop} onPress={() => state.showCancel && close(false)}>
          <Pressable
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {}}
          >
            <View style={[styles.iconCircle, { backgroundColor: meta.color + '22', borderColor: meta.color }]}>
              <Ionicons name={meta.icon} size={30} color={meta.color} />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>{state.title}</Text>
            {!!state.message && <Text style={[styles.message, { color: theme.textMuted }]}>{state.message}</Text>}

            <View style={styles.actions}>
              {state.showCancel && (
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                  onPress={() => close(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cancelText, { color: theme.textMuted }]}>{state.cancelText}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: meta.color }, !state.showCancel && { flex: 1 }]}
                onPress={() => close(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmText}>{state.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside DialogProvider');
  return ctx;
}

/** API imperativa para usar desde helpers (fuera de componentes React) */
export function getDialogApi(): DialogApi | null {
  return imperativeApi;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700' },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
