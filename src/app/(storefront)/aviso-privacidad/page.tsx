import { getPrivacyPolicy } from "@/lib/settings";

export const metadata = {
  title: "Aviso de privacidad",
  description:
    "Cómo Hirata Impresión Digital recolecta, usa y protege tus datos personales.",
};
export const revalidate = 300;

export default async function PrivacyPolicyPage() {
  const policy = await getPrivacyPolicy();
  const lastUpdated = policy.updated_at
    ? new Date(policy.updated_at).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Aviso de privacidad
        </h1>
        {lastUpdated ? (
          <p className="text-sm text-muted-foreground">
            Última actualización: {lastUpdated}
          </p>
        ) : null}
      </header>

      <article
        className="mt-8 space-y-4 text-sm leading-relaxed text-foreground/90 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
        // Admin-authored HTML (admin-only RLS write).
        dangerouslySetInnerHTML={{ __html: policy.content }}
      />
    </div>
  );
}
