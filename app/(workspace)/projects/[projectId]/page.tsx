import { WorkspacePage } from "@/app/components/layout/workspace-page";
import {Suspense} from "react";
import {TasksView} from "@/app/components/tasks/tasks-view";
async function Content({params}:{params:Promise<{projectId:string}>}){const {projectId}=await params;return <TasksView key={projectId} projectId={projectId}/>;}
export default function ProjectPage({params}:{params:Promise<{projectId:string}>}){return <WorkspacePage><Suspense fallback={<p role="status">Loading project...</p>}><Content params={params}/></Suspense></WorkspacePage>;}
