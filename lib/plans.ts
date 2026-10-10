/** Planos do Blackbook. Pro = pagou a ativação (creator_profiles.platform_paid). */
export const PLANS = {
  free: { key: "free", label: "Grátis", priceCents: 0, feePercent: 5 },
  pro: { key: "pro", label: "Pro", priceCents: 99700, feePercent: 0 },
} as const;

export type PlanKey = keyof typeof PLANS;

export function planOf(platformPaid: boolean | null | undefined) {
  return platformPaid ? PLANS.pro : PLANS.free;
}

export function platformFeeCents(amountCents: number, platformPaid: boolean | null | undefined) {
  return Math.round(amountCents * (planOf(platformPaid).feePercent / 100));
}
