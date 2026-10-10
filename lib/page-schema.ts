export type SectionType =
  | "hero" | "video" | "about" | "modules" | "benefits" | "audience" | "gallery"
  | "image" | "testimonials" | "bonus" | "guarantee" | "faq" | "text" | "cta";

export interface SectionStyle {
  background?: "default" | "alt" | "accent" | "image";
  image?: string;
  spacing?: "compact" | "normal" | "spacious";
}

export interface Section {
  id: string;
  type: SectionType;
  variant?: string;
  props: Record<string, any>;
  style?: SectionStyle;
}

export interface PageDoc {
  version: 1;
  sections: Section[];
}

type FieldSpec = number | "url" | "number";
interface TypeSpec {
  label: string;
  variants: string[];
  fields: Record<string, FieldSpec>;
  lists?: Record<string, { max: number; fields: Record<string, FieldSpec> }>;
}

const EYEBROW = 80;
const TITLE = 140;
const SUB = 400;

export const SECTION_SPECS: Record<SectionType, TypeSpec> = {
  hero: { label: "Capa", variants: ["center", "split", "image"], fields: { eyebrow: EYEBROW, title: TITLE, subtitle: SUB, cta_label: 40, image: "url" } },
  video: { label: "Vídeo de apresentação", variants: ["default"], fields: { eyebrow: EYEBROW, title: TITLE, subtitle: SUB } },
  about: { label: "Sobre o professor", variants: ["image-right", "image-left", "centered"], fields: { eyebrow: EYEBROW, title: TITLE, text: 2000, image: "url" } },
  modules: { label: "Módulos do curso", variants: ["grid", "list"], fields: { eyebrow: EYEBROW, title: TITLE, subtitle: SUB } },
  benefits: {
    label: "Benefícios", variants: ["grid", "list"], fields: { eyebrow: EYEBROW, title: TITLE, subtitle: SUB },
    lists: { items: { max: 12, fields: { title: 100, text: 400 } } },
  },
  audience: {
    label: "Para quem é", variants: ["card", "checklist"], fields: { eyebrow: EYEBROW, title: TITLE, text: 1500 },
    lists: { items: { max: 10, fields: { text: 200 } } },
  },
  gallery: {
    label: "Galeria de fotos", variants: ["grid", "mosaic"], fields: { eyebrow: EYEBROW, title: TITLE, subtitle: SUB },
    lists: { images: { max: 12, fields: { url: "url", caption: 120, credit: 120 } } },
  },
  image: { label: "Imagem", variants: ["contained", "full"], fields: { url: "url", caption: 200, credit: 120 } },
  testimonials: { label: "Depoimentos", variants: ["grid"], fields: { eyebrow: EYEBROW, title: TITLE } },
  bonus: {
    label: "Bônus", variants: ["grid"], fields: { eyebrow: EYEBROW, title: TITLE, subtitle: SUB },
    lists: { items: { max: 8, fields: { title: 100, text: 400, value: 40 } } },
  },
  guarantee: { label: "Garantia", variants: ["default"], fields: { title: TITLE, text: 800, days: "number" } },
  faq: {
    label: "Perguntas frequentes", variants: ["default"], fields: { eyebrow: EYEBROW, title: TITLE },
    lists: { items: { max: 15, fields: { q: 200, a: 1200 } } },
  },
  text: { label: "Texto livre", variants: ["left", "center"], fields: { eyebrow: EYEBROW, title: TITLE, text: 4000 } },
  cta: { label: "Chamada final (preço e compra)", variants: ["card", "plain"], fields: { eyebrow: EYEBROW, title: TITLE, text: SUB, button_label: 40 } },
};

export const SECTION_TYPES = Object.keys(SECTION_SPECS) as SectionType[];
const MAX_SECTIONS = 20;

function allowedImageHosts() {
  const hosts = ["images.unsplash.com", "imagedelivery.net"];
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) hosts.push(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host);
  } catch {}
  return hosts;
}

export function isAllowedImageUrl(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 1000) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && allowedImageHosts().includes(u.host);
  } catch {
    return false;
  }
}

function cleanValue(spec: FieldSpec, v: unknown) {
  if (spec === "url") return isAllowedImageUrl(v) ? v : undefined;
  if (spec === "number") {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 3650 ? Math.round(n) : undefined;
  }
  if (typeof v !== "string") return undefined;
  const s = v.trim().slice(0, spec);
  return s || undefined;
}

export function newSectionId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Validates and trims a section; returns null if the type is unknown. */
export function sanitizeSection(raw: any): Section | null {
  if (!raw || typeof raw !== "object") return null;
  const type = raw.type as SectionType;
  const spec = SECTION_SPECS[type];
  if (!spec) return null;

  const props: Record<string, any> = {};
  const src = raw.props && typeof raw.props === "object" ? raw.props : {};
  for (const [key, fs] of Object.entries(spec.fields)) {
    const v = cleanValue(fs, src[key]);
    if (v !== undefined) props[key] = v;
  }
  for (const [key, ls] of Object.entries(spec.lists ?? {})) {
    if (!Array.isArray(src[key])) continue;
    const items = src[key]
      .slice(0, ls.max)
      .map((item: any) => {
        const out: Record<string, any> = {};
        for (const [k, fs] of Object.entries(ls.fields)) {
          const v = cleanValue(fs, item?.[k]);
          if (v !== undefined) out[k] = v;
        }
        return out;
      })
      .filter((o: Record<string, any>) => Object.keys(o).length > 0);
    props[key] = items;
  }

  const style: SectionStyle = {};
  const rs = raw.style && typeof raw.style === "object" ? raw.style : {};
  if (["default", "alt", "accent", "image"].includes(rs.background)) style.background = rs.background;
  if (isAllowedImageUrl(rs.image)) style.image = rs.image;
  if (style.background === "image" && !style.image) delete style.background;
  if (["compact", "normal", "spacious"].includes(rs.spacing)) style.spacing = rs.spacing;

  return {
    id: typeof raw.id === "string" && /^[a-z0-9]{4,16}$/.test(raw.id) ? raw.id : newSectionId(),
    type,
    variant: spec.variants.includes(raw.variant) ? raw.variant : spec.variants[0],
    props,
    style,
  };
}

export function sanitizePage(raw: any): PageDoc | null {
  if (!raw || !Array.isArray(raw.sections)) return null;
  const seen = new Set<string>();
  const sections = raw.sections
    .slice(0, MAX_SECTIONS)
    .map(sanitizeSection)
    .filter((s: Section | null): s is Section => !!s)
    .map((s: Section) => {
      if (seen.has(s.id)) s.id = newSectionId();
      seen.add(s.id);
      return s;
    });
  return { version: 1, sections };
}

/** Page used when the creator never customized the layout: mirrors the original template. */
export function defaultPage(course: any): PageDoc {
  const s = (type: SectionType, variant?: string, style?: SectionStyle): Section => ({
    id: type, type, variant: variant ?? SECTION_SPECS[type].variants[0], props: {}, style: style ?? {},
  });
  const sections: Section[] = [s("hero")];
  if (course?.video_id) sections.push(s("video"));
  sections.push(s("about"));
  if (course?.creator_modules?.length) sections.push(s("modules", "grid", { background: "alt" }));
  if (course?.target_audience) sections.push(s("audience"));
  if (course?.creator_testimonials?.length) sections.push(s("testimonials"));
  sections.push(s("cta"));
  return { version: 1, sections };
}

/** Compact description of the schema for the AI prompt. */
export function schemaForPrompt() {
  return SECTION_TYPES.map((t) => {
    const sp = SECTION_SPECS[t];
    const fields = Object.entries(sp.fields).map(([k, v]) => (v === "url" ? `${k}:url` : v === "number" ? `${k}:n` : k));
    const lists = Object.entries(sp.lists ?? {}).map(([k, l]) => `${k}:[{${Object.keys(l.fields).join(",")}}]`);
    return `${t} [${sp.variants.join("|")}] ${[...fields, ...lists].join(" ")}`;
  }).join("\n");
}
