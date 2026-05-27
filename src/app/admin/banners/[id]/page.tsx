import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BannerForm } from "@/app/admin/banners/_components/banner-form";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Editar banner" };

export default async function EditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: banner }, { data: categories }] = await Promise.all([
    supabase.from("banners").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("name"),
  ]);
  if (!banner) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPageHeader title={banner.title} backHref="/admin/banners" />
      <Card>
        <CardContent className="p-6">
          <BannerForm banner={banner} categories={categories ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
