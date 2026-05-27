import { ProfileForm } from "@/app/(storefront)/mi-cuenta/perfil/_components/profile-form";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-bold tracking-tight">Perfil</h2>
        <p className="text-sm text-muted-foreground">
          Actualiza tus datos personales.
        </p>
      </header>
      <Card className="max-w-xl">
        <CardContent className="p-6">
          <ProfileForm profile={profile ?? null} email={user.email ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
