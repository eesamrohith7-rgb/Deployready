import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Checker from "@/components/Checker";
import DeepTestingRoadmap from "@/components/DeepTestingRoadmap";

export const metadata = { title: "DeployReady — Project Zip Scanner" };

export default function FilesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-grow w-full max-w-container-max mx-auto px-4 md:px-8 py-12 flex flex-col gap-8">
        <section className="border-l-4 border-primary-container pl-6 py-2">
          <h1 className="font-sans text-headline-xl text-on-surface mb-3 tracking-tight">
            Project_Zip_Scanner
          </h1>
          <p className="font-mono text-code-md text-on-surface-variant max-w-2xl">
            Upload your project .zip to detect missing files, broken imports, undeclared
            deps, Dockerfile hygiene, hard-coded secrets, and missing observability /
            RUM / validation libraries.
          </p>
        </section>
        <section>
          <Checker />
        </section>
        <section>
          <DeepTestingRoadmap />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
