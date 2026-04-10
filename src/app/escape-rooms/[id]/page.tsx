import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminEscapeRoomDetailPanel from "./_AdminDetailPanel";

export default async function EscapeRoomDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as { id: string }).id },
      select: { role: true },
    });
    if (user?.role === "admin") {
      return <AdminEscapeRoomDetailPanel id={params.id} />;
    }
  }

  // Non-admins are redirected to the coming soon page
  redirect("/escape-rooms");
}
