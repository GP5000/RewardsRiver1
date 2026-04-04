import React from "react";

export const metadata = {
  title: "Admin | Offers",
  description: "Manage RewardsRiver offer inventory",
};

export default function AdminOffersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // keep it minimal; styling is fine in page.tsx
  return <>{children}</>;
}
