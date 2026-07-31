"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/rbac";
import { ownProfileSchema } from "@/lib/validations";
import { errorState, successState, type ActionState } from "@/server/actions/types";

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
