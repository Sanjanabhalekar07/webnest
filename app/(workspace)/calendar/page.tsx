import { CalendarView } from "@/app/components/calendar/calendar-view";
import { WorkspacePage } from "@/app/components/layout/workspace-page";

export default function Page() {
  return (
    <WorkspacePage>
      <CalendarView />
    </WorkspacePage>
  );
}
