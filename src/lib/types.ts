export type Priority = "high" | "normal" | "low";

export type Todo = {
  id: string;
  title: string;
  note: string;
  category: CategoryId;
  assignee: string;
  dueDate: string | null; // YYYY-MM-DD
  priority: Priority;
  done: boolean;
  doneAt: string | null;
  doneBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TodoInput = Partial<
  Pick<Todo, "title" | "note" | "category" | "assignee" | "dueDate" | "priority" | "done" | "createdBy" | "doneBy">
>;

export const CATEGORIES = [
  { id: "health", label: "健康・検査", emoji: "🩺" },
  { id: "body", label: "体づくり・生活習慣", emoji: "🥗" },
  { id: "money", label: "お金・制度", emoji: "💰" },
  { id: "work", label: "仕事・職場", emoji: "💼" },
  { id: "life", label: "暮らし・話し合い", emoji: "🏠" },
  { id: "other", label: "その他", emoji: "📝" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as CategoryId[];

export const PRIORITIES: { id: Priority; label: string }[] = [
  { id: "high", label: "高" },
  { id: "normal", label: "中" },
  { id: "low", label: "低" },
];

export const BOTH = "ふたり";
