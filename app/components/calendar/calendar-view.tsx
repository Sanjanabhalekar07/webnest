"use client";
import {useState} from "react";
import {useWorkspace} from "@/app/providers/workspace-provider";
import {initials,members,statuses} from "@/app/lib/model";
import {percent} from "@/app/lib/task-utils";
import {Icon} from "../ui/app-icon";
import {PageHeading} from "../layout/page-heading";
export function CalendarView(){const {data,projects,allTasks:tasks,allTasks,setEditingTask}=useWorkspace();
const [calendarOffset,setCalendarOffset]=useState(0);const calendarMonth=new Date();calendarMonth.setDate(1);calendarMonth.setMonth(calendarMonth.getMonth()+calendarOffset);const days=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0).getDate();
return <><PageHeading title="Calendar"/><section className="panel"><div className="section-heading"><h2>{calendarMonth.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</h2><div className="filter-controls"><button className="secondary" aria-label="Previous month" onClick={() => setCalendarOffset(calendarOffset - 1)}>←</button><button className="secondary" onClick={() => setCalendarOffset(0)}>Today</button><button className="secondary" aria-label="Next month" onClick={() => setCalendarOffset(calendarOffset + 1)}>→</button></div></div><div className="calendar-grid">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day) => <strong className="calendar-heading" key={day}>{day}</strong>)}{Array.from({length: calendarMonth.getDay()},(_,index) => <div className="calendar-day blank" key={`blank-${index}`}/>)}{Array.from({length: days},(_,index) => { const day = index + 1; const date = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`; return <div className="calendar-day" key={day}><span>{day}</span>{tasks.filter((task) => task.dueDate === date).map((task) => <button key={task.id} onClick={() => setEditingTask(task)}>{task.title}</button>)}</div>; })}</div></section></>;}
