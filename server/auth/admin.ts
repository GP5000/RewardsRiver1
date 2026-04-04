import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/authOptions";
import { User } from "@/server/db/models/User";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  const sessionUser = session?.user as any;
  if (!sessionUser?.id) {
    throw new Error("Not authenticated");
  }

  const user = await User.findById(sessionUser.id)
    .select("role isAdmin")
    .lean() as any;

  const isAdmin = user && (user.role === "admin" || user.isAdmin === true);

  if (!isAdmin) {
    throw new Error("Forbidden");
  }

  return { userId: sessionUser.id as string };
}
