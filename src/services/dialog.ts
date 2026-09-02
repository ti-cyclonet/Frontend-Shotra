import { Alert, Platform } from 'react-native';
import { getDialogApi } from '../context/DialogProvider';

type DialogVariant = 'default' | 'success' | 'danger' | 'warning' | 'info';

/** Deduce un estilo (icono/color) a partir del titulo para dar mejor feedback visual. */
function inferVariant(title: string, confirmText?: string): DialogVariant {
  const t = title.toLowerCase();
  if (t.includes('error')) return 'danger';
  if (t.includes('rechaz')) return 'danger';
  if (t.includes('elimina') || t.includes('cancelar')) return 'danger';
  if (t.includes('aceptad') || t.includes('completad') || t.includes('enviad') || t.includes('publicad') || t.includes('firma')) return 'success';
  if (t.includes('requerid') || t.includes('atencion')) return 'warning';
  const c = (confirmText || '').toLowerCase();
  if (c.includes('rechaz') || c.includes('elimina')) return 'danger';
  return 'default';
}

/**
 * Confirmacion con estilo propio (modal oscuro de la app).
 * Fallback a Alert nativo si el DialogProvider no esta montado.
 */
export function confirmDialog(
  title: string,
  message: string,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  variant?: DialogVariant,
): Promise<boolean> {
  const api = getDialogApi();
  if (api) {
    return api.confirm({
      title,
      message,
      confirmText,
      cancelText,
      variant: variant || inferVariant(title, confirmText),
    });
  }

  // Fallback
  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm(`${title}\n\n${message}`)
      : true;
    return Promise.resolve(ok);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, onPress: () => resolve(true) },
    ]);
  });
}

/** Aviso simple con estilo propio. */
export function alertDialog(title: string, message?: string, variant?: DialogVariant): Promise<boolean> {
  const api = getDialogApi();
  if (api) {
    return api.alert({
      title,
      message,
      confirmText: 'Entendido',
      variant: variant || inferVariant(title),
    });
  }

  // Fallback
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return Promise.resolve(true);
  }
  Alert.alert(title, message);
  return Promise.resolve(true);
}
