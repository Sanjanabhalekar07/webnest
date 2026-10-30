import {TasksView} from "@/app/components/tasks/tasks-view";
import { WorkspacePage } from "@/app/components/layout/workspace-page";

export default function Page() {
  return <WorkspacePage><TasksView mine/></WorkspacePage>;
}
