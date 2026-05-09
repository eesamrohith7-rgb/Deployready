import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Scanner from "@/components/scanner/Scanner";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <Scanner />
      <SiteFooter />
    </div>
  );
}
