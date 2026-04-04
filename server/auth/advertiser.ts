// server/auth/advertiser.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/authOptions";
import { AdvertiserProfile } from "@/server/db/models/AdvertiserProfile";

export async function requireAdvertiser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  if (session.user.role !== "advertiser") {
    throw new Error("Access denied: advertiser role required");
  }

  const userId = session.user.id;

  const advertiser = await AdvertiserProfile.findOne({ user: userId });

  if (!advertiser) {
    throw new Error("Advertiser profile not found for this user.");
  }

  return {
    advertiserId: advertiser._id.toString(),
    userId,
    advertiserStatus: advertiser.status,
  };
}
