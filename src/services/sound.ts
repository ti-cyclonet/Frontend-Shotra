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
