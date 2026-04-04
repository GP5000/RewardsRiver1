// app/publisher/docs/page.tsx
"use client";

import PublisherIntegrationDocs from "@/components/PublisherIntegrationDocs";
import DocsTopBar from "@/components/publisher/DocsTopBar";

export default function PublisherDocsPage() {
  return (
    <div className="flex-1 px-4 pb-10 pt-6 sm:px-8">
      <PublisherIntegrationDocs variant="internal" header={<DocsTopBar />} />
    </div>
  );
}
