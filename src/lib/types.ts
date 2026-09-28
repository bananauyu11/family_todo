export type Todo = {
  id: string;
  title: string;
  note: string;
  done: boolean;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TodoInput = Partial<Pick<Todo, "title" | "note" | "done">>;
