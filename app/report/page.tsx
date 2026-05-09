import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import ReportView from "@/components/scanner/ReportView";

export const metadata = {
  title: "DeployReady — Scan Report",
};

export default function ReportPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <ReportView />
      <SiteFooter />
    </div>
  );
}
