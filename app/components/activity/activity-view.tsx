"use client";
import {useState} from "react";
import {useWorkspace} from "@/app/providers/workspace-provider";
import {initials,members,statuses} from "@/app/lib/model";
import {percent} from "@/app/lib/task-utils";
import {Icon} from "../ui/app-icon";
import {PageHeading} from "../layout/page-heading";
export function ActivityView(){const {data,projects,allTasks:tasks,allTasks,setEditingTask}=useWorkspace();

return <><PageHeading title="Activity"/><section className="panel activity-list"><h2>Workspace activity</h2>{data.activity.map((event) => <div className="activity-item" key={event.id}><span className="activity-bullet"><Icon name="check" size={18}/></span><div><p>{event.text}</p><small>{new Date(event.date).toLocaleString()}</small></div></div>)}</section></>;}
