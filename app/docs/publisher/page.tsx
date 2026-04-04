// app/docs/publisher/page.tsx
"use client";

import DocsTopBar from "@/components/publisher/DocsTopBar";
import PublisherIntegrationDocs from "@/components/PublisherIntegrationDocs";

export default function PublicPublisherDocsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#020617] via-black to-black text-white">
      <div className="mx-auto flex max-w-6xl gap-8 px-4 pb-16 pt-20 sm:px-6 lg:px-8">
        {/* Left docs navigation is inside PublisherIntegrationDocs */}
        <PublisherIntegrationDocs variant="public" header={<DocsTopBar />} />
      </div>
    </main>
  );
}
