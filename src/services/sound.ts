import { Platform, Vibration } from 'react-native';

/**
 * Reproduce un sonido de notificacion de forma multiplataforma sin dependencias extra.
 * - Web: usa Web Audio API (un breve "ding" de dos tonos).
 * - Nativo: vibra (el sonido del sistema lo emite la notificacion local de expo-notifications).
 */
let webAudioCtx: any = null;

export function playNotificationSound() {
  try {
    if (Platform.OS === 'web') {
      playWebBeep();
    } else {
      // En nativo, una vibracion corta acompana la notificacion local del sistema
      Vibration.vibrate(200);
    }
  } catch {
    // silencioso: el sonido no debe romper la app
  }
}

/**
 * Sonido distinto para mensajes de chat (para diferenciarlo de las
 * notificaciones generales: nuevas ofertas, contrato firmado, evaluaciones).
 * - Web: un solo tono agudo y corto (vs. el "ding-dong" de dos tonos general).
 * - Nativo: patron de vibracion doble-pulso (vs. el pulso unico general).
 */
export function playChatMessageSound() {
  try {
    if (Platform.OS === 'web') {
      playWebChatBeep();
    } else {
      Vibration.vibrate([0, 80, 60, 80]);
    }
  } catch {
    // silencioso: el sonido no debe romper la app
  }
}

function playWebChatBeep() {
  const AudioContextClass =
    (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
  if (!AudioContextClass) return;

  if (!webAudioCtx) webAudioCtx = new AudioContextClass();
  const ctx = webAudioCtx;
  if (ctx.state === 'suspended') ctx.resume();

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 1500;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

function playWebBeep() {
  const AudioContextClass =
    (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
  if (!AudioContextClass) return;

  if (!webAudioCtx) webAudioCtx = new AudioContextClass();
  const ctx = webAudioCtx;
  if (ctx.state === 'suspended') ctx.resume();

  const now = ctx.currentTime;

  // Dos tonos ascendentes tipo "ding-dong" suave
  const tones = [
    { freq: 880, start: 0, dur: 0.12 },
    { freq: 1174, start: 0.12, dur: 0.18 },
  ];

  for (const t of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = t.freq;
    gain.gain.setValueAtTime(0.0001, now + t.start);
    gain.gain.exponentialRampToValueAtTime(0.25, now + t.start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + t.start);
    osc.stop(now + t.start + t.dur + 0.02);
  }
}
