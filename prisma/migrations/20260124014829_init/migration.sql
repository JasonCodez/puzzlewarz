-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "joinCode" TEXT,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invites" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzle_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "categoryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "requiredPreviousPuzzleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "unlocksAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "isTeamPuzzle" BOOLEAN NOT NULL DEFAULT false,
    "minTeamSize" INTEGER NOT NULL DEFAULT 1,
    "puzzleType" TEXT NOT NULL DEFAULT 'general',
    "riddleAnswer" TEXT,

    CONSTRAINT "puzzles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jigsaw_puzzles" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "gridRows" INTEGER NOT NULL DEFAULT 3,
    "gridCols" INTEGER NOT NULL DEFAULT 4,
    "snapTolerance" INTEGER NOT NULL DEFAULT 12,
    "rotationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jigsaw_puzzles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sudoku_puzzles" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "puzzleGrid" TEXT NOT NULL,
    "solutionGrid" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "timeLimitSeconds" INTEGER,

    CONSTRAINT "sudoku_puzzles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escape_room_puzzles" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "roomTitle" TEXT NOT NULL,
    "roomDescription" TEXT NOT NULL,
    "timeLimitSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escape_room_puzzles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escape_stages" (
    "id" TEXT NOT NULL,
    "escapeRoomId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "puzzleType" TEXT NOT NULL,
    "puzzleData" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "hints" TEXT NOT NULL DEFAULT '[]',
    "rewardItem" TEXT,
    "rewardDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escape_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_escape_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "escapeRoomId" TEXT NOT NULL,
    "currentStageIndex" INTEGER NOT NULL DEFAULT 0,
    "solvedStages" TEXT NOT NULL DEFAULT '[]',
    "inventory" TEXT NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalTimeSpent" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_escape_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_layouts" (
    "id" TEXT NOT NULL,
    "escapeRoomId" TEXT NOT NULL,
    "title" TEXT,
    "backgroundUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotspots" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "x" INTEGER NOT NULL DEFAULT 0,
    "y" INTEGER NOT NULL DEFAULT 0,
    "w" INTEGER NOT NULL DEFAULT 32,
    "h" INTEGER NOT NULL DEFAULT 32,
    "type" TEXT NOT NULL DEFAULT 'interactive',
    "targetId" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotspots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escape_locks" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "lockType" TEXT NOT NULL DEFAULT 'code',
    "requirement" TEXT,
    "secret" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "requiredItemKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escape_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_definitions" (
    "id" TEXT NOT NULL,
    "escapeRoomId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "consumable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_triggers" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "condition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_room_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "escapeRoomId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_room_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_solutions" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT true,
    "points" INTEGER NOT NULL DEFAULT 100,
    "isRegex" BOOLEAN NOT NULL DEFAULT false,
    "ignoreCase" BOOLEAN NOT NULL DEFAULT true,
    "ignoreWhitespace" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzle_solutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_hints" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "costPoints" INTEGER NOT NULL DEFAULT 10,
    "maxUsesPerTeam" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "averageTimeToSolve" DOUBLE PRECISION,
    "maxUsesPerUser" INTEGER,
    "timesLeadToSolve" INTEGER NOT NULL DEFAULT 0,
    "totalUsages" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puzzle_hints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hint_history" (
    "id" TEXT NOT NULL,
    "hintId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "revealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "solvedAt" TIMESTAMP(3),
    "timeToSolve" INTEGER,
    "leadToSolve" BOOLEAN NOT NULL DEFAULT false,
    "wasHelpful" BOOLEAN,

    CONSTRAINT "hint_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_media" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnail" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puzzle_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hint_usages" (
    "id" TEXT NOT NULL,
    "hintId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hint_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_puzzle_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "solvedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "averageTimePerAttempt" DOUBLE PRECISION,
    "completionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentSessionStart" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "successfulAttempts" INTEGER NOT NULL DEFAULT 0,
    "totalTimeSpent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_puzzle_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_session_logs" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "sessionStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionEnd" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "hintUsed" BOOLEAN NOT NULL DEFAULT false,
    "attemptMade" BOOLEAN NOT NULL DEFAULT false,
    "wasSuccessful" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "puzzle_session_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_parts" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "pointsValue" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puzzle_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_part_solutions" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT true,
    "points" INTEGER NOT NULL DEFAULT 50,
    "isRegex" BOOLEAN NOT NULL DEFAULT false,
    "ignoreCase" BOOLEAN NOT NULL DEFAULT true,
    "ignoreWhitespace" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzle_part_solutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_part_progress" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "solvedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puzzle_part_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_progress" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "solvedAt" TIMESTAMP(3),
    "solvedBy" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_submissions" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzle_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_entries" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "rank" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "solvedAt" TIMESTAMP(3) NOT NULL,
    "timeTaken" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_leaderboard" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "puzzlesSolved" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "requirement" TEXT NOT NULL,
    "conditionType" TEXT NOT NULL,
    "conditionValue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_streaks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastSolveDate" TIMESTAMP(3),
    "streakStartDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT,
    "inviteCode" TEXT NOT NULL,
    "inviteEmail" TEXT,
    "refereeJoinedAt" TIMESTAMP(3),
    "refereeFirstPuzzleSolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "icon" TEXT,
    "relatedId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "emailRead" BOOLEAN NOT NULL DEFAULT false,
    "emailReadAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailOnPuzzleRelease" BOOLEAN NOT NULL DEFAULT true,
    "emailOnAchievement" BOOLEAN NOT NULL DEFAULT true,
    "emailOnTeamUpdate" BOOLEAN NOT NULL DEFAULT true,
    "emailOnLeaderboard" BOOLEAN NOT NULL DEFAULT true,
    "emailOnSystem" BOOLEAN NOT NULL DEFAULT false,
    "enableDigest" BOOLEAN NOT NULL DEFAULT false,
    "digestFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "themeBrightness" TEXT NOT NULL DEFAULT 'medium',
    "fontSize" TEXT NOT NULL DEFAULT 'medium',
    "spacingMode" TEXT NOT NULL DEFAULT 'comfortable',
    "reduceAnimations" BOOLEAN NOT NULL DEFAULT false,
    "colorContrast" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "relatedId" TEXT,
    "relatedType" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lobby_messages" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lobby_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "puzzleId" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "replyToId" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_post_votes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "voteType" TEXT NOT NULL DEFAULT 'up',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_post_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_comment_votes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "voteType" TEXT NOT NULL DEFAULT 'up',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_comment_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_post_views" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "postId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_post_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_puzzle_part_assignments" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "assignedToUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_puzzle_part_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_puzzle_part_submissions" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "solvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_puzzle_part_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_puzzle_completions" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "totalPointsEarned" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_puzzle_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_ratings" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puzzle_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relay_riddles" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "puzzleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "solverClues" TEXT NOT NULL,
    "solverAnswer" TEXT NOT NULL,
    "encryptedMsg" TEXT NOT NULL,
    "cipherType" TEXT NOT NULL DEFAULT 'shift',
    "solverUserId" TEXT,
    "decoderUserId" TEXT,
    "solverSubmittedAt" TIMESTAMP(3),
    "solvedAt" TIMESTAMP(3),

    CONSTRAINT "relay_riddles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relay_messages" (
    "id" TEXT NOT NULL,
    "relayId" TEXT NOT NULL,
    "userId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relay_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arg_phases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arg_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arg_puzzles" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "puzzleType" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "puzzleData" JSONB NOT NULL,
    "solution" TEXT NOT NULL,
    "hints" JSONB NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arg_puzzles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arg_puzzle_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "solution" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "arg_puzzle_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arg_phase_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arg_phase_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "puzzleType" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "difficulty" TEXT NOT NULL,
    "category" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puzzle_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_versions" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL,
    "solutions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "puzzle_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_schedules" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "releaseAt" TIMESTAMP(3),
    "unlocksAt" TIMESTAMP(3),
    "timedDuration" INTEGER,
    "countdownStartsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "timezone" TEXT,
    "schedulingType" TEXT NOT NULL DEFAULT 'immediate',
    "isLive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puzzle_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hint_tiers" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "tierNumber" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "costPoints" INTEGER NOT NULL DEFAULT 0,
    "progressRequired" INTEGER,
    "delaySeconds" INTEGER,
    "maxUsesPerPlayer" INTEGER NOT NULL DEFAULT 1,
    "revealType" TEXT NOT NULL DEFAULT 'full',
    "isProgressive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hint_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hint_usage_logs" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hintTierId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "costPaid" INTEGER NOT NULL,
    "leadToSolve" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "hint_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_analytics" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "totalCompletions" INTEGER NOT NULL DEFAULT 0,
    "totalPlayers" INTEGER NOT NULL DEFAULT 0,
    "averageSolveTime" DOUBLE PRECISION,
    "medianSolveTime" DOUBLE PRECISION,
    "tooEasy" INTEGER NOT NULL DEFAULT 0,
    "perfectDifficulty" INTEGER NOT NULL DEFAULT 0,
    "tooDifficult" INTEGER NOT NULL DEFAULT 0,
    "averageHintsUsed" DOUBLE PRECISION,
    "abandonmentRate" DOUBLE PRECISION,
    "playersWhoUsedHints" INTEGER NOT NULL DEFAULT 0,
    "dailyAttempts" JSONB,
    "hourlyEngagement" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzle_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_validators" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "validationType" TEXT NOT NULL,
    "name" TEXT,
    "pattern" TEXT,
    "flags" TEXT,
    "scriptCode" TEXT,
    "apiEndpoint" TEXT,
    "apiMethod" TEXT DEFAULT 'POST',
    "apiHeaders" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_validators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_relationships" (
    "id" TEXT NOT NULL,
    "puzzleIdA" TEXT NOT NULL,
    "puzzleIdB" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "description" TEXT,
    "campaignId" TEXT,
    "sequenceOrder" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "unlocksOn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzle_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "theme" TEXT,
    "targetDifficulty" TEXT,
    "estimatedPlaytime" INTEGER,
    "isLinear" BOOLEAN NOT NULL DEFAULT true,
    "maxConcurrent" INTEGER,
    "totalReward" INTEGER NOT NULL DEFAULT 0,
    "badge" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puzzle_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_operations" (
    "id" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sourceData" JSONB NOT NULL,
    "results" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsTotal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bulk_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_name_key" ON "users"("name");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "teams_joinCode_key" ON "teams"("joinCode");

-- CreateIndex
CREATE INDEX "teams_createdBy_idx" ON "teams"("createdBy");

-- CreateIndex
CREATE INDEX "team_members_teamId_idx" ON "team_members"("teamId");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_userId_key" ON "team_members"("teamId", "userId");

-- CreateIndex
CREATE INDEX "team_invites_teamId_idx" ON "team_invites"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "team_invites_teamId_userId_key" ON "team_invites"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_categories_name_key" ON "puzzle_categories"("name");

-- CreateIndex
CREATE INDEX "puzzles_categoryId_idx" ON "puzzles"("categoryId");

-- CreateIndex
CREATE INDEX "puzzles_order_idx" ON "puzzles"("order");

-- CreateIndex
CREATE UNIQUE INDEX "jigsaw_puzzles_puzzleId_key" ON "jigsaw_puzzles"("puzzleId");

-- CreateIndex
CREATE INDEX "jigsaw_puzzles_puzzleId_idx" ON "jigsaw_puzzles"("puzzleId");

-- CreateIndex
CREATE UNIQUE INDEX "sudoku_puzzles_puzzleId_key" ON "sudoku_puzzles"("puzzleId");

-- CreateIndex
CREATE INDEX "sudoku_puzzles_puzzleId_idx" ON "sudoku_puzzles"("puzzleId");

-- CreateIndex
CREATE UNIQUE INDEX "escape_room_puzzles_puzzleId_key" ON "escape_room_puzzles"("puzzleId");

-- CreateIndex
CREATE INDEX "escape_room_puzzles_puzzleId_idx" ON "escape_room_puzzles"("puzzleId");

-- CreateIndex
CREATE INDEX "escape_stages_escapeRoomId_idx" ON "escape_stages"("escapeRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "escape_stages_escapeRoomId_order_key" ON "escape_stages"("escapeRoomId", "order");

-- CreateIndex
CREATE INDEX "user_escape_progress_userId_idx" ON "user_escape_progress"("userId");

-- CreateIndex
CREATE INDEX "user_escape_progress_escapeRoomId_idx" ON "user_escape_progress"("escapeRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "user_escape_progress_userId_escapeRoomId_key" ON "user_escape_progress"("userId", "escapeRoomId");

-- CreateIndex
CREATE INDEX "room_layouts_escapeRoomId_idx" ON "room_layouts"("escapeRoomId");

-- CreateIndex
CREATE INDEX "hotspots_layoutId_idx" ON "hotspots"("layoutId");

-- CreateIndex
CREATE INDEX "escape_locks_layoutId_idx" ON "escape_locks"("layoutId");

-- CreateIndex
CREATE UNIQUE INDEX "item_definitions_key_key" ON "item_definitions"("key");

-- CreateIndex
CREATE INDEX "item_definitions_escapeRoomId_idx" ON "item_definitions"("escapeRoomId");

-- CreateIndex
CREATE INDEX "room_triggers_layoutId_idx" ON "room_triggers"("layoutId");

-- CreateIndex
CREATE INDEX "player_room_states_userId_idx" ON "player_room_states"("userId");

-- CreateIndex
CREATE INDEX "player_room_states_teamId_idx" ON "player_room_states"("teamId");

-- CreateIndex
CREATE INDEX "player_room_states_escapeRoomId_idx" ON "player_room_states"("escapeRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "player_room_states_userId_escapeRoomId_key" ON "player_room_states"("userId", "escapeRoomId");

-- CreateIndex
CREATE INDEX "puzzle_solutions_puzzleId_idx" ON "puzzle_solutions"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_hints_puzzleId_idx" ON "puzzle_hints"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_hints_order_idx" ON "puzzle_hints"("order");

-- CreateIndex
CREATE INDEX "hint_history_hintId_idx" ON "hint_history"("hintId");

-- CreateIndex
CREATE INDEX "hint_history_userId_idx" ON "hint_history"("userId");

-- CreateIndex
CREATE INDEX "hint_history_revealedAt_idx" ON "hint_history"("revealedAt");

-- CreateIndex
CREATE INDEX "puzzle_media_puzzleId_idx" ON "puzzle_media"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_media_type_idx" ON "puzzle_media"("type");

-- CreateIndex
CREATE INDEX "hint_usages_hintId_idx" ON "hint_usages"("hintId");

-- CreateIndex
CREATE INDEX "hint_usages_userId_idx" ON "hint_usages"("userId");

-- CreateIndex
CREATE INDEX "user_puzzle_progress_userId_idx" ON "user_puzzle_progress"("userId");

-- CreateIndex
CREATE INDEX "user_puzzle_progress_puzzleId_idx" ON "user_puzzle_progress"("puzzleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_puzzle_progress_userId_puzzleId_key" ON "user_puzzle_progress"("userId", "puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_session_logs_progressId_idx" ON "puzzle_session_logs"("progressId");

-- CreateIndex
CREATE INDEX "puzzle_session_logs_userId_idx" ON "puzzle_session_logs"("userId");

-- CreateIndex
CREATE INDEX "puzzle_session_logs_sessionStart_idx" ON "puzzle_session_logs"("sessionStart");

-- CreateIndex
CREATE INDEX "puzzle_parts_puzzleId_idx" ON "puzzle_parts"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_parts_order_idx" ON "puzzle_parts"("order");

-- CreateIndex
CREATE INDEX "puzzle_part_solutions_partId_idx" ON "puzzle_part_solutions"("partId");

-- CreateIndex
CREATE INDEX "puzzle_part_progress_partId_idx" ON "puzzle_part_progress"("partId");

-- CreateIndex
CREATE INDEX "puzzle_part_progress_progressId_idx" ON "puzzle_part_progress"("progressId");

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_part_progress_partId_progressId_key" ON "puzzle_part_progress"("partId", "progressId");

-- CreateIndex
CREATE INDEX "team_progress_teamId_idx" ON "team_progress"("teamId");

-- CreateIndex
CREATE INDEX "team_progress_puzzleId_idx" ON "team_progress"("puzzleId");

-- CreateIndex
CREATE UNIQUE INDEX "team_progress_teamId_puzzleId_key" ON "team_progress"("teamId", "puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_submissions_puzzleId_idx" ON "puzzle_submissions"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_submissions_userId_idx" ON "puzzle_submissions"("userId");

-- CreateIndex
CREATE INDEX "puzzle_submissions_isCorrect_idx" ON "puzzle_submissions"("isCorrect");

-- CreateIndex
CREATE INDEX "leaderboard_entries_puzzleId_idx" ON "leaderboard_entries"("puzzleId");

-- CreateIndex
CREATE INDEX "leaderboard_entries_points_idx" ON "leaderboard_entries"("points");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_entries_puzzleId_userId_teamId_key" ON "leaderboard_entries"("puzzleId", "userId", "teamId");

-- CreateIndex
CREATE INDEX "announcements_publishedAt_idx" ON "announcements"("publishedAt");

-- CreateIndex
CREATE INDEX "events_startDate_endDate_idx" ON "events"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_name_key" ON "achievements"("name");

-- CreateIndex
CREATE INDEX "user_achievements_userId_idx" ON "user_achievements"("userId");

-- CreateIndex
CREATE INDEX "user_achievements_achievementId_idx" ON "user_achievements"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "user_achievements"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "user_streaks_userId_key" ON "user_streaks"("userId");

-- CreateIndex
CREATE INDEX "user_streaks_userId_idx" ON "user_streaks"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_referrals_inviteCode_key" ON "user_referrals"("inviteCode");

-- CreateIndex
CREATE INDEX "user_referrals_referrerId_idx" ON "user_referrals"("referrerId");

-- CreateIndex
CREATE INDEX "user_referrals_refereeId_idx" ON "user_referrals"("refereeId");

-- CreateIndex
CREATE INDEX "user_referrals_inviteCode_idx" ON "user_referrals"("inviteCode");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_emailSent_idx" ON "notifications"("emailSent");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE INDEX "activities_userId_idx" ON "activities"("userId");

-- CreateIndex
CREATE INDEX "activities_type_idx" ON "activities"("type");

-- CreateIndex
CREATE INDEX "activities_createdAt_idx" ON "activities"("createdAt");

-- CreateIndex
CREATE INDEX "follows_followerId_idx" ON "follows"("followerId");

-- CreateIndex
CREATE INDEX "follows_followingId_idx" ON "follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "direct_messages_senderId_idx" ON "direct_messages"("senderId");

-- CreateIndex
CREATE INDEX "direct_messages_recipientId_idx" ON "direct_messages"("recipientId");

-- CreateIndex
CREATE INDEX "direct_messages_createdAt_idx" ON "direct_messages"("createdAt");

-- CreateIndex
CREATE INDEX "lobby_messages_teamId_puzzleId_idx" ON "lobby_messages"("teamId", "puzzleId");

-- CreateIndex
CREATE INDEX "lobby_messages_userId_idx" ON "lobby_messages"("userId");

-- CreateIndex
CREATE INDEX "forum_posts_authorId_idx" ON "forum_posts"("authorId");

-- CreateIndex
CREATE INDEX "forum_posts_puzzleId_idx" ON "forum_posts"("puzzleId");

-- CreateIndex
CREATE INDEX "forum_posts_createdAt_idx" ON "forum_posts"("createdAt");

-- CreateIndex
CREATE INDEX "forum_posts_isPinned_idx" ON "forum_posts"("isPinned");

-- CreateIndex
CREATE INDEX "forum_comments_authorId_idx" ON "forum_comments"("authorId");

-- CreateIndex
CREATE INDEX "forum_comments_postId_idx" ON "forum_comments"("postId");

-- CreateIndex
CREATE INDEX "forum_comments_replyToId_idx" ON "forum_comments"("replyToId");

-- CreateIndex
CREATE INDEX "forum_comments_createdAt_idx" ON "forum_comments"("createdAt");

-- CreateIndex
CREATE INDEX "forum_post_votes_userId_idx" ON "forum_post_votes"("userId");

-- CreateIndex
CREATE INDEX "forum_post_votes_postId_idx" ON "forum_post_votes"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "forum_post_votes_userId_postId_key" ON "forum_post_votes"("userId", "postId");

-- CreateIndex
CREATE INDEX "forum_comment_votes_userId_idx" ON "forum_comment_votes"("userId");

-- CreateIndex
CREATE INDEX "forum_comment_votes_commentId_idx" ON "forum_comment_votes"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "forum_comment_votes_userId_commentId_key" ON "forum_comment_votes"("userId", "commentId");

-- CreateIndex
CREATE INDEX "forum_post_views_userId_idx" ON "forum_post_views"("userId");

-- CreateIndex
CREATE INDEX "forum_post_views_postId_idx" ON "forum_post_views"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "forum_post_views_userId_postId_key" ON "forum_post_views"("userId", "postId");

-- CreateIndex
CREATE INDEX "team_puzzle_part_assignments_teamId_idx" ON "team_puzzle_part_assignments"("teamId");

-- CreateIndex
CREATE INDEX "team_puzzle_part_assignments_puzzleId_idx" ON "team_puzzle_part_assignments"("puzzleId");

-- CreateIndex
CREATE INDEX "team_puzzle_part_assignments_partId_idx" ON "team_puzzle_part_assignments"("partId");

-- CreateIndex
CREATE INDEX "team_puzzle_part_assignments_assignedToUserId_idx" ON "team_puzzle_part_assignments"("assignedToUserId");

-- CreateIndex
CREATE UNIQUE INDEX "team_puzzle_part_assignments_teamId_puzzleId_partId_key" ON "team_puzzle_part_assignments"("teamId", "puzzleId", "partId");

-- CreateIndex
CREATE INDEX "team_puzzle_part_submissions_teamId_idx" ON "team_puzzle_part_submissions"("teamId");

-- CreateIndex
CREATE INDEX "team_puzzle_part_submissions_puzzleId_idx" ON "team_puzzle_part_submissions"("puzzleId");

-- CreateIndex
CREATE INDEX "team_puzzle_part_submissions_partId_idx" ON "team_puzzle_part_submissions"("partId");

-- CreateIndex
CREATE INDEX "team_puzzle_part_submissions_submittedByUserId_idx" ON "team_puzzle_part_submissions"("submittedByUserId");

-- CreateIndex
CREATE INDEX "team_puzzle_completions_teamId_idx" ON "team_puzzle_completions"("teamId");

-- CreateIndex
CREATE INDEX "team_puzzle_completions_puzzleId_idx" ON "team_puzzle_completions"("puzzleId");

-- CreateIndex
CREATE UNIQUE INDEX "team_puzzle_completions_teamId_puzzleId_key" ON "team_puzzle_completions"("teamId", "puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_ratings_puzzleId_idx" ON "puzzle_ratings"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_ratings_userId_idx" ON "puzzle_ratings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_ratings_puzzleId_userId_key" ON "puzzle_ratings"("puzzleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "relay_riddles_roomId_key" ON "relay_riddles"("roomId");

-- CreateIndex
CREATE INDEX "relay_riddles_roomId_idx" ON "relay_riddles"("roomId");

-- CreateIndex
CREATE INDEX "relay_riddles_status_idx" ON "relay_riddles"("status");

-- CreateIndex
CREATE INDEX "relay_messages_relayId_idx" ON "relay_messages"("relayId");

-- CreateIndex
CREATE INDEX "relay_messages_userId_idx" ON "relay_messages"("userId");

-- CreateIndex
CREATE INDEX "arg_phases_isActive_idx" ON "arg_phases"("isActive");

-- CreateIndex
CREATE INDEX "arg_puzzles_phaseId_idx" ON "arg_puzzles"("phaseId");

-- CreateIndex
CREATE INDEX "arg_puzzles_puzzleType_idx" ON "arg_puzzles"("puzzleType");

-- CreateIndex
CREATE INDEX "arg_puzzles_isPublished_idx" ON "arg_puzzles"("isPublished");

-- CreateIndex
CREATE INDEX "arg_puzzle_progress_userId_idx" ON "arg_puzzle_progress"("userId");

-- CreateIndex
CREATE INDEX "arg_puzzle_progress_puzzleId_idx" ON "arg_puzzle_progress"("puzzleId");

-- CreateIndex
CREATE INDEX "arg_puzzle_progress_completed_idx" ON "arg_puzzle_progress"("completed");

-- CreateIndex
CREATE UNIQUE INDEX "arg_puzzle_progress_userId_puzzleId_key" ON "arg_puzzle_progress"("userId", "puzzleId");

-- CreateIndex
CREATE INDEX "arg_phase_progress_userId_idx" ON "arg_phase_progress"("userId");

-- CreateIndex
CREATE INDEX "arg_phase_progress_phaseId_idx" ON "arg_phase_progress"("phaseId");

-- CreateIndex
CREATE INDEX "arg_phase_progress_completed_idx" ON "arg_phase_progress"("completed");

-- CreateIndex
CREATE UNIQUE INDEX "arg_phase_progress_userId_phaseId_key" ON "arg_phase_progress"("userId", "phaseId");

-- CreateIndex
CREATE INDEX "puzzle_templates_puzzleType_idx" ON "puzzle_templates"("puzzleType");

-- CreateIndex
CREATE INDEX "puzzle_templates_isPublic_idx" ON "puzzle_templates"("isPublic");

-- CreateIndex
CREATE INDEX "puzzle_versions_puzzleId_idx" ON "puzzle_versions"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_versions_status_idx" ON "puzzle_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_versions_puzzleId_versionNumber_key" ON "puzzle_versions"("puzzleId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_schedules_puzzleId_key" ON "puzzle_schedules"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_schedules_puzzleId_idx" ON "puzzle_schedules"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_schedules_releaseAt_idx" ON "puzzle_schedules"("releaseAt");

-- CreateIndex
CREATE INDEX "hint_tiers_puzzleId_idx" ON "hint_tiers"("puzzleId");

-- CreateIndex
CREATE UNIQUE INDEX "hint_tiers_puzzleId_tierNumber_key" ON "hint_tiers"("puzzleId", "tierNumber");

-- CreateIndex
CREATE INDEX "hint_usage_logs_puzzleId_idx" ON "hint_usage_logs"("puzzleId");

-- CreateIndex
CREATE INDEX "hint_usage_logs_userId_idx" ON "hint_usage_logs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_analytics_puzzleId_key" ON "puzzle_analytics"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_analytics_puzzleId_idx" ON "puzzle_analytics"("puzzleId");

-- CreateIndex
CREATE INDEX "custom_validators_puzzleId_idx" ON "custom_validators"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_relationships_puzzleIdA_idx" ON "puzzle_relationships"("puzzleIdA");

-- CreateIndex
CREATE INDEX "puzzle_relationships_puzzleIdB_idx" ON "puzzle_relationships"("puzzleIdB");

-- CreateIndex
CREATE INDEX "puzzle_relationships_relationshipType_idx" ON "puzzle_relationships"("relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_relationships_puzzleIdA_puzzleIdB_key" ON "puzzle_relationships"("puzzleIdA", "puzzleIdB");

-- CreateIndex
CREATE INDEX "puzzle_campaigns_isLinear_idx" ON "puzzle_campaigns"("isLinear");

-- CreateIndex
CREATE INDEX "bulk_operations_status_idx" ON "bulk_operations"("status");

-- CreateIndex
CREATE INDEX "bulk_operations_operationType_idx" ON "bulk_operations"("operationType");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzles" ADD CONSTRAINT "puzzles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "puzzle_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzles" ADD CONSTRAINT "puzzles_requiredPreviousPuzzleId_fkey" FOREIGN KEY ("requiredPreviousPuzzleId") REFERENCES "puzzles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jigsaw_puzzles" ADD CONSTRAINT "jigsaw_puzzles_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sudoku_puzzles" ADD CONSTRAINT "sudoku_puzzles_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escape_room_puzzles" ADD CONSTRAINT "escape_room_puzzles_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escape_stages" ADD CONSTRAINT "escape_stages_escapeRoomId_fkey" FOREIGN KEY ("escapeRoomId") REFERENCES "escape_room_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_escape_progress" ADD CONSTRAINT "user_escape_progress_escapeRoomId_fkey" FOREIGN KEY ("escapeRoomId") REFERENCES "escape_room_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_escape_progress" ADD CONSTRAINT "user_escape_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_layouts" ADD CONSTRAINT "room_layouts_escapeRoomId_fkey" FOREIGN KEY ("escapeRoomId") REFERENCES "escape_room_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotspots" ADD CONSTRAINT "hotspots_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "room_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escape_locks" ADD CONSTRAINT "escape_locks_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "room_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_definitions" ADD CONSTRAINT "item_definitions_escapeRoomId_fkey" FOREIGN KEY ("escapeRoomId") REFERENCES "escape_room_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_triggers" ADD CONSTRAINT "room_triggers_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "room_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_room_states" ADD CONSTRAINT "player_room_states_escapeRoomId_fkey" FOREIGN KEY ("escapeRoomId") REFERENCES "escape_room_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_solutions" ADD CONSTRAINT "puzzle_solutions_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_hints" ADD CONSTRAINT "puzzle_hints_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hint_history" ADD CONSTRAINT "hint_history_hintId_fkey" FOREIGN KEY ("hintId") REFERENCES "puzzle_hints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hint_history" ADD CONSTRAINT "hint_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_media" ADD CONSTRAINT "puzzle_media_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hint_usages" ADD CONSTRAINT "hint_usages_hintId_fkey" FOREIGN KEY ("hintId") REFERENCES "puzzle_hints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hint_usages" ADD CONSTRAINT "hint_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_puzzle_progress" ADD CONSTRAINT "user_puzzle_progress_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_puzzle_progress" ADD CONSTRAINT "user_puzzle_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_session_logs" ADD CONSTRAINT "puzzle_session_logs_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "user_puzzle_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_session_logs" ADD CONSTRAINT "puzzle_session_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_parts" ADD CONSTRAINT "puzzle_parts_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_part_solutions" ADD CONSTRAINT "puzzle_part_solutions_partId_fkey" FOREIGN KEY ("partId") REFERENCES "puzzle_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_part_progress" ADD CONSTRAINT "puzzle_part_progress_partId_fkey" FOREIGN KEY ("partId") REFERENCES "puzzle_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_part_progress" ADD CONSTRAINT "puzzle_part_progress_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "user_puzzle_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_progress" ADD CONSTRAINT "team_progress_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_progress" ADD CONSTRAINT "team_progress_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_submissions" ADD CONSTRAINT "puzzle_submissions_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_submissions" ADD CONSTRAINT "puzzle_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_referrals" ADD CONSTRAINT "user_referrals_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_referrals" ADD CONSTRAINT "user_referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lobby_messages" ADD CONSTRAINT "lobby_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_comments" ADD CONSTRAINT "forum_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_comments" ADD CONSTRAINT "forum_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_comments" ADD CONSTRAINT "forum_comments_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "forum_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_post_votes" ADD CONSTRAINT "forum_post_votes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_post_votes" ADD CONSTRAINT "forum_post_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_comment_votes" ADD CONSTRAINT "forum_comment_votes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "forum_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_comment_votes" ADD CONSTRAINT "forum_comment_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_post_views" ADD CONSTRAINT "forum_post_views_postId_fkey" FOREIGN KEY ("postId") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_post_views" ADD CONSTRAINT "forum_post_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_puzzle_part_assignments" ADD CONSTRAINT "team_puzzle_part_assignments_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_puzzle_part_assignments" ADD CONSTRAINT "team_puzzle_part_assignments_partId_fkey" FOREIGN KEY ("partId") REFERENCES "puzzle_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_puzzle_part_assignments" ADD CONSTRAINT "team_puzzle_part_assignments_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_puzzle_part_assignments" ADD CONSTRAINT "team_puzzle_part_assignments_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_puzzle_part_submissions" ADD CONSTRAINT "team_puzzle_part_submissions_partId_fkey" FOREIGN KEY ("partId") REFERENCES "puzzle_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_puzzle_part_submissions" ADD CONSTRAINT "team_puzzle_part_submissions_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_puzzle_part_submissions" ADD CONSTRAINT "team_puzzle_part_submissions_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_puzzle_part_submissions" ADD CONSTRAINT "team_puzzle_part_submissions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_puzzle_completions" ADD CONSTRAINT "team_puzzle_completions_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_puzzle_completions" ADD CONSTRAINT "team_puzzle_completions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_ratings" ADD CONSTRAINT "puzzle_ratings_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_ratings" ADD CONSTRAINT "puzzle_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relay_riddles" ADD CONSTRAINT "relay_riddles_decoderUserId_fkey" FOREIGN KEY ("decoderUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relay_riddles" ADD CONSTRAINT "relay_riddles_solverUserId_fkey" FOREIGN KEY ("solverUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relay_messages" ADD CONSTRAINT "relay_messages_relayId_fkey" FOREIGN KEY ("relayId") REFERENCES "relay_riddles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relay_messages" ADD CONSTRAINT "relay_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arg_puzzles" ADD CONSTRAINT "arg_puzzles_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "arg_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arg_puzzle_progress" ADD CONSTRAINT "arg_puzzle_progress_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "arg_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arg_puzzle_progress" ADD CONSTRAINT "arg_puzzle_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arg_phase_progress" ADD CONSTRAINT "arg_phase_progress_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "arg_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arg_phase_progress" ADD CONSTRAINT "arg_phase_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_versions" ADD CONSTRAINT "puzzle_versions_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_schedules" ADD CONSTRAINT "puzzle_schedules_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hint_tiers" ADD CONSTRAINT "hint_tiers_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hint_usage_logs" ADD CONSTRAINT "hint_usage_logs_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_analytics" ADD CONSTRAINT "puzzle_analytics_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_validators" ADD CONSTRAINT "custom_validators_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_relationships" ADD CONSTRAINT "puzzle_relationships_puzzleIdA_fkey" FOREIGN KEY ("puzzleIdA") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_relationships" ADD CONSTRAINT "puzzle_relationships_puzzleIdB_fkey" FOREIGN KEY ("puzzleIdB") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
