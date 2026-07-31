-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CONTESTANT', 'JUDGE', 'ADMIN');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('NOT_STARTED', 'RUNNING', 'SUBMISSION_OPEN', 'JUDGING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ContestantStatus" AS ENUM ('REGISTERED', 'CONFIRMED', 'ACTIVE', 'SUBMITTED', 'SHORTLISTED', 'DISQUALIFIED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NOT_SUBMITTED', 'UPLOADING', 'SUBMITTED', 'LATE', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('REGISTRATION_CONFIRMATION', 'THREE_DAYS_BEFORE', 'TWO_DAYS_BEFORE', 'ONE_DAY_BEFORE', 'ONE_HOUR_BEFORE', 'ASSETS_RELEASED', 'SUBMISSION_RECEIVED', 'RESULTS_ANNOUNCED');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "HiringRecommendation" AS ENUM ('STRONG_HIRE', 'HIRE', 'FREELANCE_ROSTER', 'KEEP_WARM', 'NO_HIRE');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CONTESTANT',
    "emailVerified" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'LOGIN',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hackathons" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "edition" INTEGER NOT NULL DEFAULT 1,
    "idYear" INTEGER NOT NULL DEFAULT 2026,
    "idPrefix" TEXT NOT NULL DEFAULT 'EA',
    "status" "EventStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "registrationOpensAt" TIMESTAMP(3) NOT NULL,
    "registrationClosesAt" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "taskReleaseAt" TIMESTAMP(3) NOT NULL,
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "judgingEndsAt" TIMESTAMP(3) NOT NULL,
    "resultsAt" TIMESTAMP(3) NOT NULL,
    "assetZipName" TEXT NOT NULL DEFAULT 'Editor_Arena_Task_Files.zip',
    "assetDriveFileId" TEXT,
    "assetDriveUrl" TEXT,
    "assetZipPassword" TEXT,
    "assetsReleased" BOOLEAN NOT NULL DEFAULT false,
    "passwordReleased" BOOLEAN NOT NULL DEFAULT false,
    "assetsReleasedAt" TIMESTAMP(3),
    "passwordReleasedAt" TIMESTAMP(3),
    "submissionFolderId" TEXT,
    "maxUploadMb" INTEGER NOT NULL DEFAULT 4096,
    "allowedMimeTypes" TEXT[] DEFAULT ARRAY['video/mp4', 'video/quicktime']::TEXT[],
    "allowLateSubmission" BOOLEAN NOT NULL DEFAULT false,
    "judgingLocked" BOOLEAN NOT NULL DEFAULT false,
    "resultsPublished" BOOLEAN NOT NULL DEFAULT false,
    "judgesPerSubmission" INTEGER NOT NULL DEFAULT 5,
    "sheetId" TEXT,
    "sheetTabName" TEXT NOT NULL DEFAULT 'Registrations',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hackathons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_status_logs" (
    "id" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "from" "EventStatus",
    "to" "EventStatus" NOT NULL,
    "changedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contestants" (
    "id" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "experienceYears" INTEGER NOT NULL,
    "jobRole" TEXT NOT NULL,
    "softwareSkills" TEXT[],
    "portfolioUrl" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "socialUrl" TEXT,
    "heardFrom" TEXT,
    "status" "ContestantStatus" NOT NULL DEFAULT 'REGISTERED',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetsDownloadedAt" TIMESTAMP(3),
    "disqualifiedReason" TEXT,
    "finalScore" DOUBLE PRECISION,
    "rank" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "isRunnerUp" BOOLEAN NOT NULL DEFAULT false,
    "shortlisted" BOOLEAN NOT NULL DEFAULT false,
    "sheetRowSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contestants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "judges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "title" TEXT,
    "organization" TEXT,
    "expertise" TEXT[],
    "bio" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "judges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "judge_assignments" (
    "id" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "judge_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "driveFolderId" TEXT,
    "driveFileId" TEXT,
    "videoUrl" TEXT,
    "previewUrl" TEXT,
    "downloadUrl" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" BIGINT,
    "durationSeconds" INTEGER,
    "uploadedAt" TIMESTAMP(3),
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "rejectedReason" TEXT,
    "notes" TEXT,
    "averageScore" DOUBLE PRECISION,
    "ratingsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "creativity" DOUBLE PRECISION NOT NULL,
    "storytelling" DOUBLE PRECISION NOT NULL,
    "editingSkill" DOUBLE PRECISION NOT NULL,
    "motionGraphics" DOUBLE PRECISION NOT NULL,
    "soundDesign" DOUBLE PRECISION NOT NULL,
    "technicalQuality" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "computedScore" DOUBLE PRECISION NOT NULL,
    "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "unlockedById" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "ratingId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "recommendation" "HiringRecommendation" NOT NULL DEFAULT 'KEEP_WARM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_reminders" (
    "id" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "contestantId" TEXT,
    "type" "ReminderType" NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prizes" (
    "id" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "reward" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "icon" TEXT NOT NULL DEFAULT 'trophy',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occursAt" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "otp_tokens_email_purpose_idx" ON "otp_tokens"("email", "purpose");

-- CreateIndex
CREATE INDEX "otp_tokens_expiresAt_idx" ON "otp_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "hackathons_slug_key" ON "hackathons"("slug");

-- CreateIndex
CREATE INDEX "event_status_logs_hackathonId_createdAt_idx" ON "event_status_logs"("hackathonId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "contestants_contestantId_key" ON "contestants"("contestantId");

-- CreateIndex
CREATE UNIQUE INDEX "contestants_userId_key" ON "contestants"("userId");

-- CreateIndex
CREATE INDEX "contestants_hackathonId_status_idx" ON "contestants"("hackathonId", "status");

-- CreateIndex
CREATE INDEX "contestants_rank_idx" ON "contestants"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "contestants_hackathonId_email_key" ON "contestants"("hackathonId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "judges_userId_key" ON "judges"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "judges_email_key" ON "judges"("email");

-- CreateIndex
CREATE INDEX "judge_assignments_judgeId_completedAt_idx" ON "judge_assignments"("judgeId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "judge_assignments_judgeId_submissionId_key" ON "judge_assignments"("judgeId", "submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_contestantId_key" ON "submissions"("contestantId");

-- CreateIndex
CREATE INDEX "submissions_hackathonId_status_idx" ON "submissions"("hackathonId", "status");

-- CreateIndex
CREATE INDEX "submissions_averageScore_idx" ON "submissions"("averageScore");

-- CreateIndex
CREATE INDEX "ratings_judgeId_isSubmitted_idx" ON "ratings"("judgeId", "isSubmitted");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_submissionId_judgeId_key" ON "ratings"("submissionId", "judgeId");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_ratingId_key" ON "feedback"("ratingId");

-- CreateIndex
CREATE INDEX "email_reminders_status_scheduledFor_idx" ON "email_reminders"("status", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "email_reminders_contestantId_type_key" ON "email_reminders"("contestantId", "type");

-- CreateIndex
CREATE INDEX "faqs_hackathonId_order_idx" ON "faqs"("hackathonId", "order");

-- CreateIndex
CREATE INDEX "prizes_hackathonId_order_idx" ON "prizes"("hackathonId", "order");

-- CreateIndex
CREATE INDEX "timeline_events_hackathonId_order_idx" ON "timeline_events"("hackathonId", "order");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_status_logs" ADD CONSTRAINT "event_status_logs_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contestants" ADD CONSTRAINT "contestants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contestants" ADD CONSTRAINT "contestants_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judges" ADD CONSTRAINT "judges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judge_assignments" ADD CONSTRAINT "judge_assignments_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "judges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judge_assignments" ADD CONSTRAINT "judge_assignments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "contestants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "judges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES "ratings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_reminders" ADD CONSTRAINT "email_reminders_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_reminders" ADD CONSTRAINT "email_reminders_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "contestants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prizes" ADD CONSTRAINT "prizes_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
