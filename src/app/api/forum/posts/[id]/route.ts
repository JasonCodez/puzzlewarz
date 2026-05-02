import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateSameOrigin, enforceRateLimit, getClientAddress, containsLinks } from "@/lib/requestSecurity";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) {
      return sameOriginError;
    }

    const { id: postId } = await params;
    const session = await getServerSession(authOptions);

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, name: true, image: true } },
        puzzle: { select: { id: true, title: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, image: true } },
            replies: {
              include: {
                author: { select: { id: true, name: true, image: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Record unique view
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });

      if (user) {
        // Check if this user has already viewed this post
        const existingView = await prisma.forumPostView.findUnique({
          where: {
            userId_postId: {
              userId: user.id,
              postId,
            },
          },
        });

        // Only increment if this is a new view
        if (!existingView) {
          await prisma.forumPost.update({
            where: { id: postId },
            data: { viewCount: { increment: 1 } },
          });

          await prisma.forumPostView.create({
            data: {
              userId: user.id,
              postId,
            },
          });
        }
      }
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error fetching forum post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Rate limit: 30 comments per hour per user + 60 per IP per hour
    const [userLimit, ipLimit] = await Promise.all([
      enforceRateLimit({ key: `forum:comment:user:${user.id}`, limit: 30, windowMs: 60 * 60 * 1000, message: "You're commenting too frequently. Please slow down." }),
      enforceRateLimit({ key: `forum:comment:ip:${getClientAddress(request)}`, limit: 60, windowMs: 60 * 60 * 1000, message: "Too many comments from this location." }),
    ]);
    if (userLimit) return userLimit;
    if (ipLimit) return ipLimit;

    const body = await request.json();
    const { content, replyToId } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (typeof content !== "string" || content.trim().length > 5000) {
      return NextResponse.json({ error: "Comment must be 5,000 characters or fewer" }, { status: 400 });
    }
    if (containsLinks(content)) {
      return NextResponse.json({ error: "Links are not allowed in comments." }, { status: 400 });
    }

    // Verify post exists
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Verify reply-to comment exists if provided
    if (replyToId) {
      const replyTo = await prisma.forumComment.findUnique({
        where: { id: replyToId },
      });
      if (!replyTo) {
        return NextResponse.json(
          { error: "Reply-to comment not found" },
          { status: 404 }
        );
      }
    }

    const comment = await prisma.forumComment.create({
      data: {
        content,
        authorId: user.id,
        postId,
        replyToId: replyToId || null,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    // Increment reply count on post
    await prisma.forumPost.update({
      where: { id: postId },
      data: { replyCount: { increment: 1 } },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) {
      return sameOriginError;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user || user.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: postId } = await params;

    const existingPost = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.forumPost.delete({ where: { id: postId } });

    return NextResponse.json({ success: true, deletedPostId: postId });
  } catch (error) {
    console.error("Error deleting forum post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
