/** Relações 1-para-1 do Supabase vêm como objeto; 1-para-N como lista. Aceita os dois. */
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
