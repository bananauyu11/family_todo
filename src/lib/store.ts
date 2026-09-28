import { Redis } from "@upstash/redis";
import type { Todo } from "./types";

const KEY = "family-todo:todos";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

export const usingMemoryStore = !redis;

// Redis 未設定時（ローカル開発）のフォールバック。サーバー再起動で消える。
const g = globalThis as unknown as { __familyTodoMem?: Map<string, Todo> };
const mem = (g.__familyTodoMem ??= new Map<string, Todo>());

export async function listTodos(): Promise<Todo[]> {
  if (!redis) return [...mem.values()];
  const all = await redis.hgetall<Record<string, Todo>>(KEY);
  return all ? Object.values(all) : [];
}

export async function getTodo(id: string): Promise<Todo | null> {
  if (!redis) return mem.get(id) ?? null;
  return (await redis.hget<Todo>(KEY, id)) ?? null;
}

export async function saveTodos(todos: Todo[]): Promise<void> {
  if (todos.length === 0) return;
  if (!redis) {
    for (const t of todos) mem.set(t.id, t);
    return;
  }
  await redis.hset(KEY, Object.fromEntries(todos.map((t) => [t.id, t])));
}

export async function deleteTodo(id: string): Promise<void> {
  if (!redis) {
    mem.delete(id);
    return;
  }
  await redis.hdel(KEY, id);
}
