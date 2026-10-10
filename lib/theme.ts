export interface LPTheme {
  background: string;
  text: string;
  accent: string;
  button: string; // hex ou "metallic"
  buttonText: string;
  headingFont?: string;
}

/** Fontes de título disponíveis (Google Fonts). O corpo do texto usa sempre Inter. */
export const HEADING_FONTS: Record<string, { label: string; family: string; google?: string; uppercase: boolean; tracking?: string }> = {
  inter: { label: "Moderna (Inter)", family: "var(--font-inter), Inter, sans-serif", uppercase: true },
  bebas: { label: "Impacto (Bebas Neue)", family: "'Bebas Neue', sans-serif", google: "Bebas+Neue", uppercase: true, tracking: "0.02em" },
  oswald: { label: "Condensada (Oswald)", family: "'Oswald', sans-serif", google: "Oswald:wght@500;700", uppercase: true, tracking: "0" },
  archivo: { label: "Pesada (Archivo Black)", family: "'Archivo Black', sans-serif", google: "Archivo+Black", uppercase: true, tracking: "-0.02em" },
  playfair: { label: "Elegante (Playfair)", family: "'Playfair Display', serif", google: "Playfair+Display:wght@600;800", uppercase: false, tracking: "-0.01em" },
  pirata: { label: "Gótica (Pirata One)", family: "'Pirata One', serif", google: "Pirata+One", uppercase: false, tracking: "0.01em" },
  space: { label: "Tech (Space Grotesk)", family: "'Space Grotesk', sans-serif", google: "Space+Grotesk:wght@500;700", uppercase: false, tracking: "-0.02em" },
};

export const DEFAULT_THEME: LPTheme = {
  background: "#080808",
  text: "#FFFFFF",
  accent: "#A3A3A3",
  button: "metallic",
  buttonText: "#000000",
};

export const THEME_PRESETS: { name: string; theme: LPTheme }[] = [
  { name: "Clássico", theme: DEFAULT_THEME },
  { name: "Claro", theme: { background: "#F7F7F5", text: "#111111", accent: "#6B6B6B", button: "#111111", buttonText: "#FFFFFF" } },
  { name: "Neon", theme: { background: "#0B0614", text: "#F5F3FF", accent: "#A855F7", button: "#A855F7", buttonText: "#FFFFFF" } },
  { name: "Dourado", theme: { background: "#0A0A0A", text: "#FAFAF9", accent: "#EAB308", button: "#EAB308", buttonText: "#111111" } },
  { name: "Sangue", theme: { background: "#0A0505", text: "#FFF5F5", accent: "#EF4444", button: "#DC2626", buttonText: "#FFFFFF" } },
  { name: "Oceano", theme: { background: "#04121A", text: "#ECFEFF", accent: "#06B6D4", button: "#06B6D4", buttonText: "#04121A" } },
  { name: "Floresta", theme: { background: "#06110B", text: "#F0FDF4", accent: "#22C55E", button: "#22C55E", buttonText: "#052E16" } },
  { name: "Rosa", theme: { background: "#FFF1F5", text: "#2A0A16", accent: "#EC4899", button: "#EC4899", buttonText: "#FFFFFF" } },
];

export type ColorKey = Exclude<keyof LPTheme, "headingFont">;

export const THEME_FIELDS: { key: ColorKey; label: string }[] = [
  { key: "background", label: "Fundo" },
  { key: "text", label: "Textos" },
  { key: "accent", label: "Destaques" },
  { key: "button", label: "Botões" },
  { key: "buttonText", label: "Texto dos botões" },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Mescla tema salvo (parcial ou inválido) com o padrão; aceita a cor antiga theme_color. */
export function normalizeTheme(raw: unknown, legacyAccent?: string | null): LPTheme {
  const t: LPTheme = { ...DEFAULT_THEME };
  if (legacyAccent && HEX.test(legacyAccent)) t.accent = legacyAccent;
  if (raw && typeof raw === "object") {
    for (const { key } of THEME_FIELDS) {
      const v = (raw as any)[key];
      if (typeof v !== "string") continue;
      if (HEX.test(v) || (key === "button" && v === "metallic")) t[key] = v;
    }
    const f = (raw as any).headingFont;
    if (typeof f === "string" && HEADING_FONTS[f]) t.headingFont = f;
  }
  return t;
}

export function isValidThemeValue(key: keyof LPTheme, v: unknown) {
  if (key === "headingFont") return typeof v === "string" && !!HEADING_FONTS[v];
  return typeof v === "string" && (HEX.test(v) || (key === "button" && v === "metallic"));
}
