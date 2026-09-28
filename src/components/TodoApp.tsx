"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Template } from "@/lib/templates";
import type { Todo, TodoInput } from "@/lib/types";

type Props = {
  templates: Template[];
  hasPasscode: boolean;
};

type StatusFilter = "open" | "done";

const POLL_MS = 15000;
const URL_RE = /(https?:\/\/[^\s<>"'（）「」『』、。]+)/g;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `エラーが発生しました (${res.status})`);
  return data as T;
}

// 詳細内の URL をリンクにする
function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function TodoApp({ templates, hasPasscode }: Props) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inflight = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ todos: Todo[] }>("/api/todos");
      // 保存中の変更がある間はサーバーの古い状態で上書きしない
      if (inflight.current === 0) setTodos(data.todos);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  async function mutate(optimistic: (prev: Todo[]) => Todo[], request: () => Promise<void>) {
    const snapshot = todos;
    setTodos(optimistic);
    inflight.current++;
    try {
      await request();
      setError("");
    } catch (e) {
      setTodos(snapshot);
      setError((e as Error).message);
    } finally {
      inflight.current--;
    }
  }

  async function addTodos(inputs: TodoInput[]) {
    inflight.current++;
    try {
      const data = await api<{ todos: Todo[] }>("/api/todos", {
        method: "POST",
        body: JSON.stringify({ todos: inputs }),
      });
      setTodos((prev) => [...prev, ...data.todos]);
      setError("");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      inflight.current--;
    }
  }

  function updateTodo(id: string, input: TodoInput) {
    return mutate(
      (prev) => prev.map((t) => (t.id === id ? { ...t, ...input } : t)),
      async () => {
        const data = await api<{ todo: Todo }>(`/api/todos/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        });
        setTodos((prev) => prev.map((t) => (t.id === id ? data.todo : t)));
      },
    );
  }

  function removeTodo(todo: Todo) {
    if (!confirm(`「${todo.title}」を削除しますか？`)) return;
    return mutate(
      (prev) => prev.filter((t) => t.id !== todo.id),
      async () => {
        await api(`/api/todos/${todo.id}`, { method: "DELETE" });
      },
    );
  }

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    window.location.href = "/login";
  }

  const openCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - openCount;

  const list = useMemo(
    () =>
      todos
        .filter((t) => (status === "done" ? t.done : !t.done))
        .sort((a, b) =>
          status === "done"
            ? (b.doneAt ?? "").localeCompare(a.doneAt ?? "")
            : b.createdAt.localeCompare(a.createdAt),
        ),
    [todos, status],
  );

  const existingTitles = useMemo(() => new Set(todos.map((t) => t.title)), [todos]);

  return (
    <main className="container">
      <header className="header">
        <h1>TODO</h1>
        <div className="header-actions">
          <button className="btn ghost small" onClick={() => setShowTemplates((v) => !v)}>
            おすすめ
          </button>
          {hasPasscode && (
            <button className="btn ghost small" onClick={logout}>
              ログアウト
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="notice error-notice" role="alert">
          {error}
          <button className="link" onClick={() => setError("")}>
            閉じる
          </button>
        </div>
      )}

      {showTemplates && (
        <TemplatePicker
          templates={templates}
          existingTitles={existingTitles}
          onCancel={() => setShowTemplates(false)}
          onAdd={async (items) => {
            if (await addTodos(items)) setShowTemplates(false);
          }}
        />
      )}

      <AddForm onAdd={(input) => addTodos([input])} />

      <div className="segmented" role="tablist">
        {(
          [
            ["open", "やること", openCount],
            ["done", "完了", doneCount],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            role="tab"
            aria-selected={status === id}
            className={status === id ? "active" : ""}
            onClick={() => setStatus(id)}
          >
            {label} <span className="count">{count}</span>
          </button>
        ))}
      </div>

      {!loaded ? null : list.length === 0 ? (
        <p className="muted center">{status === "open" ? "TODOはありません" : "完了したTODOはありません"}</p>
      ) : (
        <ul className="todo-list">
          {list.map((t) =>
            editingId === t.id ? (
              <li key={t.id} className="todo editing">
                <EditForm
                  todo={t}
                  onCancel={() => setEditingId(null)}
                  onSave={async (input) => {
                    setEditingId(null);
                    await updateTodo(t.id, input);
                  }}
                />
              </li>
            ) : (
              <TodoItem
                key={t.id}
                todo={t}
                expanded={expandedId === t.id}
                onToggleExpand={() => setExpandedId(expandedId === t.id ? null : t.id)}
                onToggleDone={() => updateTodo(t.id, { done: !t.done })}
                onEdit={() => setEditingId(t.id)}
                onDelete={() => removeTodo(t)}
              />
            ),
          )}
        </ul>
      )}
    </main>
  );
}

function TodoItem({
  todo,
  expanded,
  onToggleExpand,
  onToggleDone,
  onEdit,
  onDelete,
}: {
  todo: Todo;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={`todo ${todo.done ? "is-done" : ""}`}>
      <button
        className={`check ${todo.done ? "checked" : ""}`}
        onClick={onToggleDone}
        aria-label={todo.done ? "未完了に戻す" : "完了にする"}
      >
        {todo.done ? "✓" : ""}
      </button>
      <div className="todo-body" onClick={onToggleExpand}>
        <div className="todo-title">{todo.title}</div>
        {todo.note && (
          <div className={`todo-note ${expanded ? "" : "clamp"}`}>
            <Linkified text={todo.note} />
          </div>
        )}
        {expanded && (
          <div className="todo-actions">
            <button
              className="btn small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              編集
            </button>
            <button
              className="btn small danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              削除
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function AddForm({ onAdd }: { onAdd: (input: TodoInput) => Promise<boolean> }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    if (await onAdd({ title: title.trim(), note })) {
      setTitle("");
      setNote("");
      setOpen(false);
    }
    setBusy(false);
  }

  return (
    <form className="card form" onSubmit={submit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="題目"
        maxLength={200}
      />
      {(open || note) && (
        <>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="詳細（URLも貼れます）"
            rows={3}
            maxLength={5000}
          />
          <div className="form-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setTitle("");
                setNote("");
                setOpen(false);
              }}
            >
              キャンセル
            </button>
            <button className="btn primary" disabled={busy || !title.trim()}>
              追加
            </button>
          </div>
        </>
      )}
    </form>
  );
}

function EditForm({
  todo,
  onSave,
  onCancel,
}: {
  todo: Todo;
  onSave: (input: TodoInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(todo.title);
  const [note, setNote] = useState(todo.note);

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onSave({ title: title.trim(), note });
      }}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="題目" autoFocus maxLength={200} />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="詳細（URLも貼れます）"
        rows={4}
        maxLength={5000}
      />
      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          キャンセル
        </button>
        <button className="btn primary" disabled={!title.trim()}>
          保存
        </button>
      </div>
    </form>
  );
}

function TemplatePicker({
  templates,
  existingTitles,
  onAdd,
  onCancel,
}: {
  templates: Template[];
  existingTitles: Set<string>;
  onAdd: (items: TodoInput[]) => Promise<void>;
  onCancel: () => void;
}) {
  const available = templates.filter((t) => !existingTitles.has(t.title));
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  function toggle(title: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  async function add() {
    setBusy(true);
    await onAdd(available.filter((t) => selected.has(t.title)));
    setBusy(false);
  }

  return (
    <div className="card templates">
      {available.length === 0 ? (
        <p className="muted">すべて追加済みです</p>
      ) : (
        available.map((t) => (
          <label key={t.title} className="template-item">
            <input type="checkbox" checked={selected.has(t.title)} onChange={() => toggle(t.title)} />
            <span>{t.title}</span>
          </label>
        ))
      )}
      <div className="form-actions sticky">
        {available.length > 0 && (
          <button
            className="btn ghost"
            onClick={() =>
              setSelected(selected.size === available.length ? new Set() : new Set(available.map((t) => t.title)))
            }
          >
            {selected.size === available.length ? "全解除" : "全選択"}
          </button>
        )}
        <button className="btn ghost" onClick={onCancel}>
          閉じる
        </button>
        {available.length > 0 && (
          <button className="btn primary" disabled={busy || selected.size === 0} onClick={add}>
            {selected.size}件を追加
          </button>
        )}
      </div>
    </div>
  );
}
