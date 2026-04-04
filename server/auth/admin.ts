import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/authOptions";
import { User } from "@/server/db/models/User";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const user = await User.findById(session.user.id)
    .select("role isAdmin")
    .lean();

  const isAdmin = user && (user.role === "admin" || user.isAdmin === true);

  if (!isAdmin) {
    throw new Error("Forbidden");
  }

  return { userId: session.user.id as string };
}
