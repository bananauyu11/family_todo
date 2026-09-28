import TodoApp from "@/components/TodoApp";
import { getPasscode } from "@/lib/auth";
import { getAssignees, getMembers } from "@/lib/members";
import { usingMemoryStore } from "@/lib/store";
import { TEMPLATES } from "@/lib/templates";
import { BOTH } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function Page() {
  const members = getMembers();
  const whoToName = { A: members[0], B: members[1] ?? members[0], both: BOTH };
  const templates = TEMPLATES.map(({ who, ...t }) => ({ ...t, assignee: whoToName[who] }));

  return (
    <TodoApp
      members={members}
      assignees={getAssignees()}
      templates={templates}
      usingMemoryStore={usingMemoryStore}
      hasPasscode={Boolean(getPasscode())}
    />
  );
}
