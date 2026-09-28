import { NextResponse } from "next/server";
import { deleteTodo, getTodo, saveTodos } from "@/lib/store";
import { applyUpdate, sanitize } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const todo = await getTodo(id);
  if (!todo) return NextResponse.json({ error: "not found" }, { status: 404 });
  const input = sanitize(await req.json().catch(() => null));
  if (input.title === "") delete input.title;
  const updated = applyUpdate(todo, input);
  await saveTodos([updated]);
  return NextResponse.json({ todo: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await deleteTodo(id);
  return NextResponse.json({ ok: true });
}
