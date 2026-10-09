import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCreatorByUser } from "@/lib/creator-server";

export const dynamic = "force-dynamic";

// Depois do login: criador vai para o painel, aluno para os cursos.
export default async function InicioPage() {
  const { userId } = await auth();
  if (!userId) redirect("/entrar");
  const creator = await getCreatorByUser(userId);
  redirect(creator ? "/painel" : "/dashboard");
}
