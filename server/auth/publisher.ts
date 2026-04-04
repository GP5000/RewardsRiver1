// server/auth/publisher.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/authOptions";
import { PublisherProfile } from "@/server/db/models/PublisherProfile";

export async function requirePublisher() {
  const session = await getServerSession(authOptions);

  const sessionUser = session?.user as any;
  if (!sessionUser?.id) {
    throw new Error("Not authenticated");
  }

  const userId = sessionUser.id;

  // Always find the publisher profile by user
  const publisher = await PublisherProfile.findOne({ user: userId });

  if (!publisher) {
    throw new Error("Publisher profile not found for this user.");
  }

  // ✅ Always return PublisherProfile _id as `publisherId`
  return {
    publisherId: publisher._id.toString(),
    userId,
  };
}
