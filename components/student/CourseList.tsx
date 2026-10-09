"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { BookOpen, PlayCircle, Loader2 } from "lucide-react";

interface StudentCourse {
  id: string;
  title: string;
  subtitle: string | null;
  creator: { name: string; photo_url: string | null; slug: string; theme_color: string | null } | null;
  total_lessons: number;
  completed_lessons: number;
  progress: number;
}

export function CourseList() {
  const { user } = useUser();
  const [courses, setCourses] = useState<StudentCourse[] | null>(null);

  useEffect(() => {
    fetch("/api/aluno/cursos")
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => setCourses([]));
  }, []);

  const firstName = user?.firstName || "";
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-2">
        {firstName ? `Olá, ${firstName}.` : "Meus Cursos"}
      </h1>
      <p className="text-muted-foreground mb-10">Os cursos que você comprou aparecem aqui.</p>

      {courses === null ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : courses.length === 0 ? (
        <div className="glass rounded-2xl border border-white/10 p-10 text-center max-w-lg mx-auto">
          <BookOpen className="w-10 h-10 text-primary mx-auto mb-4 opacity-70" />
          <h2 className="text-lg font-bold mb-2">Nenhum curso por aqui ainda</h2>
          <p className="text-sm text-muted-foreground">
            Comprou um curso? O acesso é liberado pelo e-mail usado no pagamento.
            {email && <> Você está conectado como <b className="text-white">{email}</b>.</>} Se pagou com outro e-mail,
            adicione-o à sua conta em <Link href="/dashboard/profile" className="text-primary hover:underline">Meu Perfil</Link>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/courses/${c.id}`}
              className="glass rounded-2xl border border-white/10 overflow-hidden hover:border-white/25 transition-colors group flex flex-col"
            >
              <div
                className="h-32 relative flex items-end p-4"
                style={{ background: `linear-gradient(135deg, ${c.creator?.theme_color || "#A3A3A3"}33, #0b0b0b)` }}
              >
                {c.creator?.photo_url && (
                  <img src={c.creator.photo_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white/20" />
                )}
                <PlayCircle className="w-10 h-10 absolute right-4 top-4 text-white/30 group-hover:text-white/80 transition-colors" />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{c.creator?.name}</p>
                <h3 className="font-bold leading-tight mb-2">{c.title}</h3>
                {c.subtitle && <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{c.subtitle}</p>}
                <div className="mt-auto">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${c.progress}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {c.completed_lessons}/{c.total_lessons} aulas · {c.progress}%
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
