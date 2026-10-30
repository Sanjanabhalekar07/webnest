import { WorkspacePage } from "@/app/components/layout/workspace-page";
import { Suspense } from "react";
import { SearchView } from "@/app/components/search/search-view";

export default function SearchPage() {
  return <WorkspacePage><Suspense fallback={<p role="status">Loading search...</p>}><SearchView/></Suspense></WorkspacePage>;
}
