import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BannerForm } from "@/app/admin/banners/_components/banner-form";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Nuevo banner" };

export default async function NewBannerPage() {
  const { supabase } = await requireAdmin();
  const [{ data: categories }, { data: carouselSections }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase
      .from("home_sections")
      .select("id, title")
      .eq("type", "carousel")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);
  const carousels = (carouselSections ?? []).map((s) => ({
    id: s.id,
    name: s.title?.trim() || "Carrusel sin nombre",
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPageHeader title="Nuevo banner" backHref="/admin/banners" />
      <Card>
        <CardContent className="p-6">
          <BannerForm categories={categories ?? []} carousels={carousels} />
        </CardContent>
      </Card>
    </div>
  );
}
