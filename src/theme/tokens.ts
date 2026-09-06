/**
 * Sistema de diseno de Shotra — tokens centrales.
 *
 * Traduce el lenguaje visual de Kiri (redondeo generoso, tipografia Poppins
 * gruesa, chips de icono tintados, gradientes, motion suave) a React Native,
 * manteniendo la paleta propia de Shotra (blanco / negro / rojo #990000 / gris).
 *
 * Estos tokens son independientes del tema (radios, espaciado, tipografia).
 * Los colores viven en ThemeProvider y se combinan con estos tokens en los
 * componentes reutilizables (src/components/ui).
 */

/** Escala de redondeo. El redondeo generoso es parte del ADN de Kiri. */
export const radius = {
  sm: 10,
  md: 14,
  lg: 16, // base
  xl: 20,
  '2xl': 24,
  pill: 9999, // FAB, badges, avatares
} as const;

/** Escala de espaciado base 4px. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24, // padding de tarjeta / separacion de secciones
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** Familia tipografica: Poppins en todos sus pesos. */
export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
  black: 'Poppins_900Black',
} as const;

/**
 * Escala tipografica (tamano, alto de linea, peso/fuente, tracking).
 * Refleja la jerarquia de Kiri: titulos gruesos, etiquetas de seccion
 * pequenas en mayusculas, cuerpo comodo.
 */
export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontFamily: fonts.extrabold, letterSpacing: -0.5 },
  h1: { fontSize: 24, lineHeight: 30, fontFamily: fonts.bold, letterSpacing: -0.3 },
  h2: { fontSize: 20, lineHeight: 26, fontFamily: fonts.semibold, letterSpacing: -0.2 },
  cardTitle: { fontSize: 18, lineHeight: 24, fontFamily: fonts.semibold, letterSpacing: -0.2 },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold },
  body: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.regular },
  captionStrong: { fontSize: 12, lineHeight: 16, fontFamily: fonts.semibold },
  micro: { fontSize: 10, lineHeight: 14, fontFamily: fonts.medium },
  // Etiqueta de seccion: 10px, bold, mayusculas, tracking amplio (firma de Kiri)
  sectionLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: fonts.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  nav: { fontSize: 9, lineHeight: 12, fontFamily: fonts.medium },
  navActive: { fontSize: 9, lineHeight: 12, fontFamily: fonts.bold },
  button: { fontSize: 15, lineHeight: 20, fontFamily: fonts.bold },
} as const;

export type TypographyKey = keyof typeof typography;

/** Sombras: tarjetas sutiles, elementos flotantes marcados. */
export const shadow = {
  none: {},
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

/** Curvas/tiempos de animacion con feel springy y organico. */
export const motion = {
  spring: { damping: 15, stiffness: 180, mass: 0.9 },
  springSoft: { damping: 18, stiffness: 120, mass: 1 },
  pressScale: 0.94, // escala al presionar (active:scale-90 de Kiri)
  duration: { fast: 160, base: 240, slow: 360 },
} as const;

/**
 * Paleta de acentos para los "icon-chips" (patron recurrente de Kiri: cuadrito
 * redondeado con fondo tintado que contiene un icono del mismo color).
 * Cada entrada = { bg (tinte suave), fg (color del icono/texto) }.
 * Colores neutros/serios acordes a la paleta de Shotra.
 */
export const chipColors = {
  red: { bg: 'rgba(153,0,0,0.12)', fg: '#990000' },
  slate: { bg: 'rgba(100,116,139,0.14)', fg: '#475569' },
  green: { bg: 'rgba(22,163,74,0.14)', fg: '#16a34a' },
  amber: { bg: 'rgba(217,119,6,0.16)', fg: '#b45309' },
  blue: { bg: 'rgba(37,99,235,0.14)', fg: '#2563eb' },
  teal: { bg: 'rgba(78,205,196,0.16)', fg: '#0f766e' },
  neutral: { bg: 'rgba(120,120,120,0.16)', fg: '#525252' },
} as const;

export type ChipColor = keyof typeof chipColors;
