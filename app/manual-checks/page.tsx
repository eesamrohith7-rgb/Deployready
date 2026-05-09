import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import ManualChecksPage from "@/components/scanner/ManualChecksPage";

export const metadata = {
  title: "DeployReady — Manual Checks",
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <ManualChecksPage />
      <SiteFooter />
    </div>
  );
}
