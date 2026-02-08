import React, { useState } from 'react';
import { ViewState } from '../types';
import { Camera, FileText, BarChart2, CheckCircle2, Menu, X } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  children: React.ReactNode;
}

// Fallback Logo - Adjusted spacing to prevent text intersection
const DEFAULT_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 80'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' style='stop-color:%234F46E5;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2306B6D4;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M25 60 L45 20 L65 60' stroke='url(%23grad)' stroke-width='3' fill='none'/%3E%3Ccircle cx='45' cy='15' r='3' fill='%23F59E0B'/%3E%3Cpath d='M35 60 L45 40 L55 60' stroke='url(%23grad)' stroke-width='2' fill='none'/%3E%3Ctext x='75' y='52' font-family='sans-serif' font-weight='800' font-size='24' fill='%231E293B'%3EHORIZON%3C/text%3E%3Ctext x='205' y='52' font-family='sans-serif' font-weight='300' font-size='24' fill='%2306B6D4'%3ELAB%3C/text%3E%3C/svg%3E";

const NavItem: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  description?: string;
}> = ({ active, onClick, icon: Icon, label, description }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-4 py-3 mb-1 rounded-xl transition-all duration-200 group ${
      active
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <div className={`p-2 rounded-lg mr-3 ${active ? 'bg-indigo-500/20' : 'bg-white border border-slate-200 group-hover:border-slate-300'}`}>
        <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}`} />
    </div>
    <div className="text-left">
        <span className="block font-semibold text-sm tracking-wide">{label}</span>
        {description && <span className={`text-[10px] block ${active ? 'text-indigo-200' : 'text-slate-400'}`}>{description}</span>}
    </div>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavClick = (view: ViewState) => {
    onNavigate(view);
    setIsSidebarOpen(false);
  };

  return (
    <div id="layout-root" className="h-screen w-full bg-slate-50 flex flex-col md:flex-row overflow-hidden relative text-slate-900 print:overflow-visible print:h-auto print:block">
      
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center z-30 flex-shrink-0 shadow-sm sticky top-0 print:hidden">
        <div className="flex items-center gap-2">
            <img 
              src="logo.png" 
              alt="Horizon Lab" 
              className="h-8 w-auto object-contain"
              onError={(e) => { e.currentTarget.src = DEFAULT_LOGO; }}
            />
            <span className="font-bold text-slate-800 tracking-tight">Horizon Lab</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus:ring-2 focus:ring-indigo-200"
          aria-label="Toggle Menu"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay/Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity print:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col h-full 
        shadow-2xl md:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]
        transition-transform duration-300 ease-in-out md:transform-none md:static md:flex-shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        print:hidden
      `}>
        <div className="p-6 border-b border-slate-100 flex flex-col items-center text-center relative">
          
          {/* Close button for Mobile inside Sidebar */}
          <button 
             onClick={() => setIsSidebarOpen(false)}
             className="md:hidden absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
             <X className="w-5 h-5" />
          </button>

          <img 
            src="logo.png" 
            alt="Horizon Lab" 
            className="w-48 h-auto mb-3 object-contain"
            onError={(e) => {
               e.currentTarget.src = DEFAULT_LOGO;
            }}
          />
          <p className="text-xs text-slate-500 font-medium">Educational Suite v1.0</p>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="px-4 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Main Menu</div>
          <NavItem
            active={currentView === ViewState.DASHBOARD}
            onClick={() => handleNavClick(ViewState.DASHBOARD)}
            icon={BarChart2}
            label="Dashboard"
            description="Overview & Analytics"
          />
          
          <div className="px-4 mt-6 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Tools</div>
          <NavItem
            active={currentView === ViewState.GENERATOR}
            onClick={() => handleNavClick(ViewState.GENERATOR)}
            icon={FileText}
            label="Paper Generator"
            description="Create Tests with AI"
          />
          <NavItem
            active={currentView === ViewState.CAMERA}
            onClick={() => handleNavClick(ViewState.CAMERA)}
            icon={Camera}
            label="Camera Station"
            description="Scan Answer Sheets"
          />
          <NavItem
            active={currentView === ViewState.EVALUATOR}
            onClick={() => handleNavClick(ViewState.EVALUATOR)}
            icon={CheckCircle2}
            label="AI Evaluator"
            description="Grade & Feedback"
          />
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    HL
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-700">Admin User</p>
                    <p className="text-xs text-slate-400">horizon@school.edu</p>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-slate-50 print:overflow-visible print:h-auto print:block">
        <div className="flex-1 overflow-y-auto w-full h-full relative scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
             {children}
        </div>
      </main>
    </div>
  );
};