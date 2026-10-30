"use client";
import {useState} from "react";
import type {Project} from "@/app/lib/model";
import {Modal} from "../ui/modal";
export default function ProjectEditor({project,onClose,onSave,onDelete}:{project:Project;onClose:()=>void;onSave:(project:Project)=>void;onDelete:(project:Project)=>void}) {
  const[draft,setDraft]=useState(project);
  return <Modal title={project.name?"Edit project":"Create a project"} onClose={onClose}><form className="editor" onSubmit={(event)=>{event.preventDefault();if(draft.name.trim())onSave({...draft,name:draft.name.trim()});}}><label>Project name<input autoFocus required maxLength={80} value={draft.name} onChange={(event)=>setDraft({...draft,name:event.target.value})} placeholder="Your next big thing"/></label><label>Description<textarea value={draft.description} onChange={(event)=>setDraft({...draft,description:event.target.value})} rows={3}/></label><label>Project color<input type="color" value={draft.color} onChange={(event)=>setDraft({...draft,color:event.target.value})}/></label><div className="modal-footer">{project.name&&<><button className="danger-button" type="button" onClick={()=>{if(window.confirm("Delete this project and all its tasks?"))onDelete(project);}}>Delete</button><button className="secondary" type="button" onClick={()=>onSave({...draft,archived:true})}>Archive</button></>}<button className="primary" type="submit">Save project</button></div></form></Modal>;
}
