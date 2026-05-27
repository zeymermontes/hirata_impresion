import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PromoStrip } from "@/app/(storefront)/_components/promo-strip";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PromoStrip />
      <SiteHeader />
      <main className="flex-1 flex flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}
