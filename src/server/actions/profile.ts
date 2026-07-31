"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/rbac";
import {
  ALLOWED_AVATAR_TYPES,
  hasStorage,
  MAX_AVATAR_BYTES,
  removeAvatar,
  uploadAvatar,
} from "@/lib/storage";
import { ownProfileSchema } from "@/lib/validations";
import {
  errorState,
  successState,
  toMessage,
  type ActionState,
} from "@/server/actions/types";

/**
 * Lets a signed-in admin or judge edit their own profile.
 *
 * Email is deliberately not editable here: it is the login identifier and is
 * unique across users, so changing it is an admin action with a collision to
 * resolve, not a self-service field.
 */
export async function updateOwnProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) return errorState("You must sign in first.");

  const parsed = ownProfileSchema.safeParse({
    name: formData.get("name"),
    title: formData.get("title") ?? "",
    organization: formData.get("organization") ?? "",
    bio: formData.get("bio") ?? "",
    expertise: formData.getAll("expertise").filter(Boolean),
  });
  if (!parsed.success) {
    return errorState(
      "Check the highlighted fields.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
      { name: String(formData.get("name") ?? "") },
    );
  }

  const { name, title, organization, bio, expertise } = parsed.data;

  await prisma.user.update({ where: { id: user.id }, data: { name } });

  // The judge row carries its own name and public bio, shown to contestants on
  // the landing page, so it has to move in step with the user record.
  if (user.role === "JUDGE") {
    await prisma.judge.updateMany({
      where: { userId: user.id },
      data: {
        name,
        title: title || null,
        organization: organization || null,
        bio: bio || null,
        expertise,
      },
    });
  }

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "profile.updated",
    entity: "User",
    entityId: user.id,
  });

  revalidatePath("/admin/profile");
  revalidatePath("/judge/profile");
  return successState("Profile updated.");
}

/**
 * Replaces a contestant's profile photo.
 *
 * Validated server-side rather than trusting the browser: the file is checked for
 * type and size here, and stored under the contestant's own id so one entrant can
 * never overwrite another's avatar.
 */
export async function updateContestantPhoto(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user || user.role !== "CONTESTANT" || !user.contestantRowId) {
    return errorState("Sign in as a contestant first.");
  }
  if (!hasStorage()) {
    return errorState(
      "Photo uploads are not configured on this deployment yet. Contact the organisers.",
    );
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return errorState("Choose an image to upload.", { photo: ["No file selected"] });
  }
  if (
    !ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number])
  ) {
    return errorState("Use a JPG, PNG or WebP image.", {
      photo: ["JPG, PNG or WebP only"],
    });
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return errorState("That image is over 2 MB.", { photo: ["Maximum 2 MB"] });
  }

  const existing = await prisma.contestant.findUnique({
    where: { id: user.contestantRowId },
    select: { photoPath: true, contestantId: true },
  });
  if (!existing) return errorState("We can't find your entry.");

  const extension =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  // Cache-busting suffix: the bucket is public and CDN-cached, so reusing one
  // path would leave the old picture served after a change.
  const path = `${existing.contestantId}/${Date.now()}.${extension}`;

  try {
    await uploadAvatar(path, await file.arrayBuffer(), file.type);
  } catch (error) {
    return errorState(toMessage(error, "The upload failed. Try again."));
  }

  await prisma.contestant.update({
    where: { id: user.contestantRowId },
    data: { photoPath: path },
  });

  if (existing.photoPath) await removeAvatar(existing.photoPath);

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "profile.photo_updated",
    entity: "Contestant",
    entityId: user.contestantRowId,
  });

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return successState("Photo updated.");
}
