import React from 'react';
import { SavedProject } from '../types';
import { Book, Trash2, Calendar, ArrowRight, FolderOpen } from 'lucide-react';

interface ProjectLibraryProps {
  projects: SavedProject[];
  onLoadProject: (project: SavedProject) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectLibrary: React.FC<ProjectLibraryProps> = ({ projects, onLoadProject, onDeleteProject }) => {
  if (projects.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <FolderOpen className="w-10 h-10 text-slate-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No Saved Projects</h2>
        <p className="text-slate-400 max-w-md">
          Create an e-book and click the "Save" icon to store it here. Your projects will live in this library.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-900">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
          <FolderOpen className="w-8 h-8 text-brand-400" />
          Your Projects
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden hover:border-brand-500 transition-all group shadow-lg">
              <div className="h-32 bg-slate-700 relative overflow-hidden">
                <img 
                  src={`https://picsum.photos/seed/${project.book.title.replace(/\s/g, '')}/400/200`} 
                  alt="Cover"
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-bold text-white text-lg truncate">{project.name}</h3>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                  <span>{project.book.chapters.length} Chapters</span>
                </div>
                
                <p className="text-sm text-slate-300 line-clamp-2 mb-6 h-10">
                  {project.book.description}
                </p>

                <div className="flex items-center gap-2 mt-auto">
                  <button 
                    onClick={() => onLoadProject(project)}
                    className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Open Project <ArrowRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDeleteProject(project.id)}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};