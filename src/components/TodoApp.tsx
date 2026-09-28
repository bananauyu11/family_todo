"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, PRIORITIES, type CategoryId, type Priority, type Todo, type TodoInput } from "@/lib/types";

type TemplateItem = {
  title: string;
  note: string;
  category: CategoryId;
  assignee: string;
  priority: Priority;
};

type Props = {
  members: string[];
  assignees: string[];
  templates: TemplateItem[];
  usingMemoryStore: boolean;
  hasPasscode: boolean;
};

type StatusFilter = "open" | "done" | "all";

const POLL_MS = 15000;
const ME_KEY = "family-todo:me";
const PRIORITY_ORDER: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDue(due: string) {
  const [, m, d] = due.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function daysUntil(due: string) {
  const [y, m, d] = due.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}

function compareOpen(a: Todo, b: Todo) {
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;
  const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (p !== 0) return p;
  return a.createdAt < b.createdAt ? -1 : 1;
}

function compareDone(a: Todo, b: Todo) {
  return (b.doneAt ?? "") < (a.doneAt ?? "") ? -1 : 1;
}

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

export default function TodoApp({ members, assignees, templates, usingMemoryStore, hasPasscode }: Props) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [me, setMe] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [assignee, setAssignee] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inflight = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ME_KEY);
      if (saved) setMe(saved);
    } catch {}
  }, []);

  function chooseMe(name: string) {
    setMe(name);
    try {
      localStorage.setItem(ME_KEY, name);
    } catch {}
  }

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
        body: JSON.stringify({ todos: inputs.map((i) => ({ ...i, createdBy: me || undefined })) }),
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
      (prev) => prev.map((t) => (t.id === id ? { ...t, ...input, updatedAt: new Date().toISOString() } : t)),
      async () => {
        const data = await api<{ todo: Todo }>(`/api/todos/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        });
        setTodos((prev) => prev.map((t) => (t.id === id ? data.todo : t)));
      },
    );
  }

  function toggleDone(todo: Todo) {
    const done = !todo.done;
    return updateTodo(todo.id, { done, doneBy: done ? me || undefined : undefined });
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

  const total = todos.length;
  const doneCount = todos.filter((t) => t.done).length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;

  const filtered = useMemo(() => {
    return todos
      .filter((t) => (status === "all" ? true : status === "done" ? t.done : !t.done))
      .filter((t) => (category === "all" ? true : t.category === category))
      .filter((t) => (assignee === "all" ? true : t.assignee === assignee))
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return a.done ? compareDone(a, b) : compareOpen(a, b);
      });
  }, [todos, status, category, assignee]);

  const groups = useMemo(() => {
    if (status === "done") return [{ id: "done", label: "完了したこと", emoji: "🎉", items: filtered }];
    return CATEGORIES.map((c) => ({ ...c, items: filtered.filter((t) => t.category === c.id) })).filter(
      (g) => g.items.length > 0,
    );
  }, [filtered, status]);

  const upcoming = useMemo(() => {
    return todos
      .filter((t) => !t.done && t.dueDate && daysUntil(t.dueDate) <= 7)
      .sort(compareOpen)
      .slice(0, 5);
  }, [todos]);

  const existingTitles = useMemo(() => new Set(todos.map((t) => t.title)), [todos]);

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>ふたりの妊活TODO</h1>
          <p className="muted small">妊娠までの準備を、ふたりで少しずつ。</p>
        </div>
        <div className="header-actions">
          <select
            className="me-select"
            value={me}
            onChange={(e) => chooseMe(e.target.value)}
            aria-label="あなたは誰？"
          >
            <option value="">あなたは？</option>
            {members.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {hasPasscode && (
            <button className="btn ghost small" onClick={logout}>
              ログアウト
            </button>
          )}
        </div>
      </header>

      {usingMemoryStore && (
        <div className="notice">
          データベース未接続のため、データは一時保存です（再起動で消えます）。Vercel で Upstash Redis
          を接続してください。
        </div>
      )}
      {error && (
        <div className="notice error-notice" role="alert">
          {error}
          <button className="link" onClick={() => setError("")}>
            閉じる
          </button>
        </div>
      )}

      <section className="card progress-card">
        <div className="progress-head">
          <span>
            進み具合 <strong>{doneCount}</strong> / {total}
          </span>
          <span className="percent">{percent}%</span>
        </div>
        <div className="progress-bar" aria-hidden>
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="member-stats">
          {assignees.map((a) => {
            const mine = todos.filter((t) => t.assignee === a);
            const d = mine.filter((t) => t.done).length;
            return (
              <span key={a} className={`chip static assignee-${assignees.indexOf(a)}`}>
                {a} {d}/{mine.length}
              </span>
            );
          })}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="card upcoming">
          <h2 className="section-title">⏰ 期限が近いもの</h2>
          <ul>
            {upcoming.map((t) => {
              const days = daysUntil(t.dueDate!);
              return (
                <li key={t.id}>
                  <span className={days < 0 ? "due overdue" : "due"}>
                    {days < 0 ? `${-days}日超過` : days === 0 ? "今日" : `あと${days}日`}
                  </span>
                  <span className="upcoming-title">{t.title}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="toolbar">
        <button
          className="btn primary"
          onClick={() => {
            setShowForm((v) => !v);
            setShowTemplates(false);
          }}
        >
          ＋ TODOを追加
        </button>
        <button
          className="btn"
          onClick={() => {
            setShowTemplates((v) => !v);
            setShowForm(false);
          }}
        >
          📋 おすすめから追加
        </button>
      </div>

      {showForm && (
        <TodoForm
          assignees={assignees}
          initial={{ category: category === "all" ? "health" : category, assignee: assignees[assignees.length - 1] }}
          submitLabel="追加する"
          onCancel={() => setShowForm(false)}
          onSubmit={async (input) => {
            if (await addTodos([input])) setShowForm(false);
          }}
        />
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

      <div className="filters">
        <div className="segmented" role="tablist">
          {(
            [
              ["open", "やること"],
              ["done", "完了"],
              ["all", "すべて"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={status === id}
              className={status === id ? "active" : ""}
              onClick={() => setStatus(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="chips">
          <button className={`chip ${category === "all" ? "active" : ""}`} onClick={() => setCategory("all")}>
            すべて
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`chip ${category === c.id ? "active" : ""}`}
              onClick={() => setCategory(category === c.id ? "all" : c.id)}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <div className="chips">
          <button className={`chip ${assignee === "all" ? "active" : ""}`} onClick={() => setAssignee("all")}>
            全員
          </button>
          {assignees.map((a) => (
            <button
              key={a}
              className={`chip ${assignee === a ? "active" : ""}`}
              onClick={() => setAssignee(assignee === a ? "all" : a)}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {!loaded ? (
        <p className="muted center">読み込み中…</p>
      ) : total === 0 ? (
        <div className="card empty">
          <p>まだTODOがありません。</p>
          <p className="muted small">「おすすめから追加」で、妊娠準備でよくある項目をまとめて登録できます。</p>
          <button className="btn primary" onClick={() => setShowTemplates(true)}>
            📋 おすすめを見る
          </button>
        </div>
      ) : groups.length === 0 ? (
        <p className="muted center">{status === "open" ? "やることはすべて完了です 🎉" : "該当するTODOはありません"}</p>
      ) : (
        groups.map((g) => (
          <section key={g.id} className="group">
            <h2 className="section-title">
              {g.emoji} {g.label} <span className="muted small">{g.items.length}</span>
            </h2>
            <ul className="todo-list">
              {g.items.map((t) =>
                editingId === t.id ? (
                  <li key={t.id}>
                    <TodoForm
                      assignees={assignees}
                      initial={t}
                      submitLabel="保存する"
                      onCancel={() => setEditingId(null)}
                      onSubmit={async (input) => {
                        setEditingId(null);
                        await updateTodo(t.id, input);
                      }}
                    />
                  </li>
                ) : (
                  <TodoItem
                    key={t.id}
                    todo={t}
                    assigneeIndex={assignees.indexOf(t.assignee)}
                    expanded={expandedId === t.id}
                    onToggleExpand={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    onToggleDone={() => toggleDone(t)}
                    onEdit={() => setEditingId(t.id)}
                    onDelete={() => removeTodo(t)}
                  />
                ),
              )}
            </ul>
          </section>
        ))
      )}

      <footer className="footer muted small">
        おすすめ項目は一般的な情報です。体のことは医師・専門家にご相談ください。
        <br />
        {POLL_MS / 1000}秒ごとに自動で同期しています。
      </footer>
    </main>
  );
}

function TodoItem({
  todo,
  assigneeIndex,
  expanded,
  onToggleExpand,
  onToggleDone,
  onEdit,
  onDelete,
}: {
  todo: Todo;
  assigneeIndex: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const days = todo.dueDate ? daysUntil(todo.dueDate) : null;
  const dueClass = days === null || todo.done ? "" : days < 0 ? "overdue" : days <= 3 ? "soon" : "";

  return (
    <li className={`todo ${todo.done ? "is-done" : ""} priority-${todo.priority}`}>
      <button
        className={`check ${todo.done ? "checked" : ""}`}
        onClick={onToggleDone}
        aria-label={todo.done ? "未完了に戻す" : "完了にする"}
      >
        {todo.done ? "✓" : ""}
      </button>
      <div className="todo-body" onClick={onToggleExpand}>
        <div className="todo-title">{todo.title}</div>
        <div className="todo-meta">
          {todo.assignee && <span className={`badge assignee-${assigneeIndex}`}>{todo.assignee}</span>}
          {todo.priority === "high" && !todo.done && <span className="badge high">優先</span>}
          {todo.dueDate && (
            <span className={`badge due ${dueClass}`}>
              📅 {formatDue(todo.dueDate)}
              {!todo.done && days !== null && days < 0 && ` (${-days}日超過)`}
            </span>
          )}
          {todo.note && !expanded && <span className="note-hint">📝</span>}
          {todo.done && todo.doneBy && <span className="muted small">{todo.doneBy}が完了</span>}
        </div>
        {expanded && (
          <div className="todo-detail">
            {todo.note && <p className="note">{todo.note}</p>}
            <p className="muted small">
              {todo.createdBy ? `${todo.createdBy}が追加・` : ""}
              {new Date(todo.createdAt).toLocaleDateString("ja-JP")}
              {todo.done && todo.doneAt && ` / 完了 ${new Date(todo.doneAt).toLocaleDateString("ja-JP")}`}
            </p>
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
          </div>
        )}
      </div>
    </li>
  );
}

function TodoForm({
  assignees,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  assignees: string[];
  initial: Partial<Todo>;
  submitLabel: string;
  onSubmit: (input: TodoInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [note, setNote] = useState(initial.note ?? "");
  const [category, setCategory] = useState<CategoryId>(initial.category ?? "other");
  const [assignee, setAssignee] = useState(initial.assignee ?? assignees[0]);
  const [dueDate, setDueDate] = useState(initial.dueDate ?? "");
  const [priority, setPriority] = useState<Priority>(initial.priority ?? "normal");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    await onSubmit({ title: title.trim(), note, category, assignee, dueDate: dueDate || null, priority });
    setBusy(false);
  }

  return (
    <form className="card form" onSubmit={submit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="やること（例：葉酸サプリを買う）"
        autoFocus
        maxLength={200}
      />
      <div className="form-row">
        <label>
          カテゴリ
          <select value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          担当
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            {assignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
            {initial.assignee && !assignees.includes(initial.assignee) && (
              <option value={initial.assignee}>{initial.assignee}</option>
            )}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          期限
          <input type="date" value={dueDate} min={initial.id ? undefined : todayStr()} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label>
          優先度
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="メモ（任意）" rows={3} maxLength={2000} />
      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          キャンセル
        </button>
        <button className="btn primary" disabled={busy || !title.trim()}>
          {busy ? "保存中…" : submitLabel}
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
  templates: TemplateItem[];
  existingTitles: Set<string>;
  onAdd: (items: TodoInput[]) => Promise<void>;
  onCancel: () => void;
}) {
  const available = templates.filter((t) => !existingTitles.has(t.title));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(available.map((t) => t.title)));
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
      <p className="muted small">
        妊娠準備（プレコンセプションケア）でよく挙げられる項目です。必要なものを選んで追加してください。
      </p>
      {available.length === 0 ? (
        <p className="muted">おすすめ項目はすべて追加済みです。</p>
      ) : (
        CATEGORIES.map((c) => {
          const items = available.filter((t) => t.category === c.id);
          if (items.length === 0) return null;
          return (
            <div key={c.id} className="template-group">
              <h3>
                {c.emoji} {c.label}
              </h3>
              {items.map((t) => (
                <label key={t.title} className="template-item">
                  <input type="checkbox" checked={selected.has(t.title)} onChange={() => toggle(t.title)} />
                  <span>
                    {t.title}
                    <span className="badge small-badge">{t.assignee}</span>
                    {t.note && <span className="muted small block">{t.note}</span>}
                  </span>
                </label>
              ))}
            </div>
          );
        })
      )}
      <div className="form-actions sticky">
        <button className="btn ghost" onClick={onCancel}>
          閉じる
        </button>
        {available.length > 0 && (
          <button className="btn primary" disabled={busy || selected.size === 0} onClick={add}>
            {busy ? "追加中…" : `${selected.size}件を追加`}
          </button>
        )}
      </div>
    </div>
  );
}
