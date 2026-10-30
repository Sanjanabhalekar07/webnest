import { ProjectsView } from "@/app/components/projects/projects-view";
import { WorkspacePage } from "@/app/components/layout/workspace-page";

export default function Page() {
  return (
    <WorkspacePage>
      <ProjectsView />
    </WorkspacePage>
  );
}
