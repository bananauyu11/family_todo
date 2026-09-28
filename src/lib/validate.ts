import type { Todo, TodoInput } from "./types";

// クライアントからの入力を Todo のフィールドに安全に変換する。
export function sanitize(input: unknown): TodoInput {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: TodoInput = {};
  if (typeof src.title === "string") out.title = src.title.trim().slice(0, 200);
  if (typeof src.note === "string") out.note = src.note.slice(0, 5000);
  if (typeof src.done === "boolean") out.done = src.done;
  return out;
}

export function newTodo(input: TodoInput): Todo {
  const now = new Date().toISOString();
  const done = input.done ?? false;
  return {
    id: crypto.randomUUID(),
    title: input.title ?? "",
    note: input.note ?? "",
    done,
    doneAt: done ? now : null,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyUpdate(todo: Todo, input: TodoInput): Todo {
  const now = new Date().toISOString();
  const next: Todo = { ...todo, ...input, updatedAt: now };
  if (input.done !== undefined && input.done !== todo.done) {
    next.doneAt = input.done ? now : null;
  }
  return next;
}
