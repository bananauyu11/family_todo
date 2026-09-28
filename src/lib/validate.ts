import { CATEGORY_IDS, PRIORITIES, type Todo, type TodoInput } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// クライアントからの入力を Todo のフィールドに安全に変換する。
export function sanitize(input: unknown): TodoInput {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: TodoInput = {};
  if (typeof src.title === "string") out.title = src.title.trim().slice(0, 200);
  if (typeof src.note === "string") out.note = src.note.slice(0, 2000);
  if (typeof src.category === "string" && (CATEGORY_IDS as string[]).includes(src.category)) {
    out.category = src.category as Todo["category"];
  }
  if (typeof src.assignee === "string") out.assignee = src.assignee.slice(0, 50);
  if (src.dueDate === null || src.dueDate === "") out.dueDate = null;
  else if (typeof src.dueDate === "string" && DATE_RE.test(src.dueDate)) out.dueDate = src.dueDate;
  if (typeof src.priority === "string" && PRIORITIES.some((p) => p.id === src.priority)) {
    out.priority = src.priority as Todo["priority"];
  }
  if (typeof src.done === "boolean") out.done = src.done;
  if (typeof src.createdBy === "string") out.createdBy = src.createdBy.slice(0, 50);
  if (typeof src.doneBy === "string") out.doneBy = src.doneBy.slice(0, 50);
  return out;
}

export function newTodo(input: TodoInput): Todo {
  const now = new Date().toISOString();
  const done = input.done ?? false;
  return {
    id: crypto.randomUUID(),
    title: input.title ?? "",
    note: input.note ?? "",
    category: input.category ?? "other",
    assignee: input.assignee ?? "",
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? "normal",
    done,
    doneAt: done ? now : null,
    doneBy: done ? (input.doneBy ?? null) : null,
    createdBy: input.createdBy ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyUpdate(todo: Todo, input: TodoInput): Todo {
  const now = new Date().toISOString();
  const next: Todo = { ...todo, ...input, updatedAt: now };
  if (input.done !== undefined && input.done !== todo.done) {
    next.doneAt = input.done ? now : null;
    next.doneBy = input.done ? (input.doneBy ?? null) : null;
  }
  return next;
}
