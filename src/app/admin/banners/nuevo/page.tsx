import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BannerForm } from "@/app/admin/banners/_components/banner-form";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Nuevo banner" };

export default async function NewBannerPage() {
  const { supabase } = await requireAdmin();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPageHeader title="Nuevo banner" backHref="/admin/banners" />
      <Card>
        <CardContent className="p-6">
          <BannerForm categories={categories ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
