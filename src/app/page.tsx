import TodoApp from "@/components/TodoApp";
import { getPasscode } from "@/lib/auth";
import { TEMPLATES } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default function Page() {
  return <TodoApp templates={TEMPLATES} hasPasscode={Boolean(getPasscode())} />;
}
