import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

/**
 * PUT /api/teams/[id]/theme
 * Body: { theme: string }
 *
 * Sets the team page theme. Only team admins can change the theme.
 * The purchasing user must own the team_theme item.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const { id: teamId } = await params;
    const { theme } = (await request.json()) as { theme: string };

    if (!theme) {
      return NextResponse.json({ error: "theme is required" }, { status: 400 });
    }

    // Check user is admin of this team
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: currentUser.id } },
    });

    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "Only team admins can change the theme" }, { status: 403 });
    }

    // Allow resetting to default without ownership check
    if (theme === "default") {
      await prisma.team.update({
        where: { id: teamId },
        data: { activeTheme: "default" },
      });
      return NextResponse.json({ success: true, theme: "default" });
    }

    // Verify the user owns the team_theme item
    const itemKey = `team_theme_${theme}`;
    const item = await prisma.storeItem.findUnique({ where: { key: itemKey } });
    if (!item) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    const owned = await prisma.userInventory.findUnique({
      where: { userId_itemId: { userId: currentUser.id, itemId: item.id } },
    });
    if (!owned) {
      return NextResponse.json({ error: "You do not own this team theme" }, { status: 403 });
    }

    await prisma.team.update({
      where: { id: teamId },
      data: { activeTheme: theme },
    });

    return NextResponse.json({ success: true, theme });
  } catch (err) {
    console.error("[TEAM THEME]", err);
    return NextResponse.json({ error: "Failed to update team theme" }, { status: 500 });
  }
}

/**
 * GET /api/teams/[id]/theme
 * Returns the team's active theme.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { activeTheme: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({ theme: team.activeTheme });
  } catch (err) {
    console.error("[TEAM THEME GET]", err);
    return NextResponse.json({ error: "Failed to get team theme" }, { status: 500 });
  }
}
