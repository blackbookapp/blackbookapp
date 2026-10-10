import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail, isAdminMetadata } from "@/lib/admin";

/**
 * Server-side: is the signed-in user an admin? Never trust the client for this.
 * Admin = Clerk publicMetadata.role "admin", or an admin e-mail that is VERIFIED
 * (sign-up may not verify e-mails, so an unverified match must not count).
 */
export async function checkIsAdmin(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  if (isAdminMetadata(user.publicMetadata)) return true;
  return user.emailAddresses.some(
    (e) => e.verification?.status === "verified" && isAdminEmail(e.emailAddress)
  );
}
