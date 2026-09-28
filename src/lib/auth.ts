export const AUTH_COOKIE = "family_todo_auth";

// 合言葉そのものは Cookie に入れず、ハッシュ値を保存する。
export async function tokenFor(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(`family-todo:${passcode}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getPasscode(): string {
  return process.env.FAMILY_PASSCODE ?? "";
}
