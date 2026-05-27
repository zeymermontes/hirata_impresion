import { AdminPageHeader } from "@/components/admin/page-header";
import { SectionsList } from "@/app/admin/secciones/_components/sections-list";
import type { Section } from "@/app/admin/secciones/_components/section-form";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Landing — Secciones" };

type SectionRow = {
  id: string;
  type: string;
  title: string | null;
  config: unknown;
  active: boolean;
  sort_order: number;
};

export default async function SectionsAdminPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("home_sections")
    .select("*")
    .order("sort_order", { ascending: true });

  const rows = (data ?? []) as SectionRow[];
  const sections: Section[] = rows.map((r) => ({
    id: r.id,
    type: r.type as Section["type"],
    title: r.title,
    config:
      r.config && typeof r.config === "object"
        ? (r.config as Record<string, unknown>)
        : {},
    active: r.active,
    sort_order: r.sort_order,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Secciones de la landing"
        description="Define qué bloques se muestran en la página principal y en qué orden. Arrastra para reordenar."
      />
      <SectionsList sections={sections} />
    </div>
  );
}
