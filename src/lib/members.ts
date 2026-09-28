import { BOTH } from "./types";

export function getMembers(): string[] {
  const names = (process.env.MEMBER_NAMES || "妻,夫")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return names.length > 0 ? names : ["妻", "夫"];
}

export function getAssignees(): string[] {
  return [...getMembers(), BOTH];
}
