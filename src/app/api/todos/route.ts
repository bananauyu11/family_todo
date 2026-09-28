import { NextResponse } from "next/server";
import { listTodos, saveTodos } from "@/lib/store";
import { newTodo, sanitize } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ todos: await listTodos() });
}

// 1件または複数件（{ todos: [...] }）の追加
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const inputs: unknown[] = Array.isArray(body?.todos) ? body.todos : [body];
  const todos = inputs
    .map(sanitize)
    .filter((i) => i.title)
    .slice(0, 100)
    .map(newTodo);
  if (todos.length === 0) {
    return NextResponse.json({ error: "タイトルを入力してください" }, { status: 400 });
  }
  await saveTodos(todos);
  return NextResponse.json({ todos }, { status: 201 });
}
