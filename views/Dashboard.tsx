import React, { useEffect, useState, useRef } from 'react';
import { getPapers, getSubmissions, getAnswerSheetById } from '../services/storage';
import { QuestionPaper, Submission } from '../types';
import { downloadPDF, viewGradedPDF } from '../services/pdfUtils';
import { FileText, Users, Clock, ArrowRight, Activity, TrendingUp, Eye, Download, X, List, FileCheck } from 'lucide-react';

declare global {
  interface Window {
    MathJax: any;
  }
}

const Dashboard: React.FC = () => {
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  
  // State for Paper Viewer Logic
  const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);
  const [showAllPapers, setShowAllPapers] = useState(false);
  const [viewerTab, setViewerTab] = useState<'QP' | 'AK'>('QP');
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPapers(getPapers());
    setSubmissions(getSubmissions());
  }, []);

  // Handle MathJax when modal opens or tab changes
  useEffect(() => {
    if (selectedPaper && modalContentRef.current && window.MathJax) {
       window.MathJax.typesetPromise([modalContentRef.current])
         .catch((err: any) => console.error(err));
    }
  }, [selectedPaper, viewerTab]);

  const downloadCSV = () => {
    const headers = ["Paper ID", "Student Name", "Marks Obtained", "Total Marks", "Percentage", "Feedback", "Date"];
    const rows = submissions.map(s => [
      s.paperId,
      s.studentName,
      s.marksObtained,
      s.totalMarks,
      `${((s.marksObtained / s.totalMarks) * 100).toFixed(2)}%`,
      `"${s.feedback.replace(/"/g, '""')}"`,
      new Date(s.timestamp).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewGradedPdf = (sub: Submission) => {
      if (!sub.answerSheetId) {
          alert("Original answer sheet scan not found for this submission.");
          return;
      }
      const sheet = getAnswerSheetById(sub.answerSheetId);
      if (!sheet || !sheet.pages || sheet.pages.length === 0) {
          alert("Answer sheet images are missing or corrupted.");
          return;
      }
      
      // Ensure pages are cleaned base64
      const images = sheet.pages.map(p => p.includes(',') ? p.split(',')[1] : p);
      
      viewGradedPDF(images, sub.annotations || []);
  };

  const StatCard = ({ icon: Icon, label, value, color, subtext }: any) => (
    <div className="bg-white p-5 md:p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 flex items-start space-x-4 hover:-translate-y-1 transition-transform duration-300">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100 flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500 truncate">{label}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
            {subtext && <p className="text-xs text-slate-400 mt-1 flex items-center truncate"><TrendingUp className="w-3 h-3 mr-1" /> {subtext}</p>}
        </div>
    </div>
  );

  const displayedPapers = showAllPapers ? papers : papers.slice(0, 5);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 relative pb-20 md:pb-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 mt-1 md:mt-2 text-sm md:text-base">Welcome back. Here is your educational overview.</p>
        </div>
        <div className="text-xs md:text-sm text-slate-500 bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-sm border border-slate-200">
            Current Session: <span className="font-semibold text-slate-800">2025-2026</span>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <StatCard 
            icon={FileText} 
            label="Papers Generated" 
            value={papers.length} 
            color="bg-blue-600"
            subtext="Total Tests Created" 
        />
        <StatCard 
            icon={Users} 
            label="Students Graded" 
            value={submissions.length} 
            color="bg-emerald-600"
            subtext="Across all subjects"
        />
        <StatCard 
            icon={Activity} 
            label="Average Performance" 
            value={submissions.length > 0 ? (submissions.reduce((acc, curr) => acc + (curr.marksObtained/curr.totalMarks), 0) / submissions.length * 100).toFixed(1) + '%' : 'N/A'} 
            color="bg-indigo-600"
            subtext="Class Average"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Recent Papers */}
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col h-full max-h-[500px] md:max-h-[600px]">
            <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl sticky top-0 z-10">
                <div>
                    <h3 className="font-bold text-slate-800 text-base md:text-lg">{showAllPapers ? 'All Papers' : 'Recent Papers'}</h3>
                    <p className="text-[10px] md:text-xs text-slate-500">
                        {showAllPapers ? 'Showing complete history' : 'Latest generated tests'}
                    </p>
                </div>
                <button 
                    onClick={() => setShowAllPapers(!showAllPapers)}
                    className="text-indigo-600 hover:text-indigo-700 text-xs md:text-sm font-medium flex items-center group bg-indigo-50 px-2 py-1 md:px-3 md:py-1.5 rounded-lg transition-colors"
                >
                    {showAllPapers ? 'Show Less' : 'View All'} 
                    <ArrowRight className={`w-3 h-3 md:w-4 md:h-4 ml-1 transition-transform ${showAllPapers ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                </button>
            </div>
            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                {papers.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No papers generated yet.</p>
                    </div>
                )}
                {displayedPapers.map(paper => (
                    <div 
                        key={paper.id} 
                        onClick={() => setSelectedPaper(paper)}
                        className="p-4 hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500 group-hover:bg-indigo-100 transition-colors flex-shrink-0">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors text-sm md:text-base truncate">{paper.testName}</h4>
                                    <p className="text-xs md:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] md:text-xs font-medium">{paper.subject}</span>
                                        <span className="text-slate-300 hidden md:inline">•</span>
                                        <span>Std {paper.std}</span>
                                        <span className="text-slate-300 hidden md:inline">•</span>
                                        <span className="text-[10px] md:text-xs">{new Date(paper.createdAt).toLocaleDateString()}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end flex-shrink-0 ml-2">
                                <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded-md border border-slate-200 mb-2 hidden md:inline-block">{paper.id}</span>
                                <Eye className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Recent Submissions */}
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col h-full max-h-[500px] md:max-h-[600px]">
            <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl sticky top-0 z-10">
                <div>
                    <h3 className="font-bold text-slate-800 text-base md:text-lg">Latest Results</h3>
                    <p className="text-[10px] md:text-xs text-slate-500">Recently graded papers</p>
                </div>
                {submissions.length > 0 && (
                    <button onClick={downloadCSV} className="text-indigo-600 hover:text-indigo-700 text-xs md:text-sm font-medium bg-indigo-50 hover:bg-indigo-100 px-2 py-1 md:px-3 md:py-1.5 rounded-lg transition-colors">
                        Export CSV
                    </button>
                )}
            </div>
            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                {submissions.length === 0 && (
                     <div className="p-8 text-center text-slate-400">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No students graded yet.</p>
                    </div>
                )}
                {submissions.slice(0, 10).map(sub => {
                    const percentage = (sub.marksObtained / sub.totalMarks) * 100;
                    let gradeColor = 'text-red-600 bg-red-50';
                    if (percentage >= 80) gradeColor = 'text-emerald-600 bg-emerald-50';
                    else if (percentage >= 60) gradeColor = 'text-amber-600 bg-amber-50';

                    return (
                        <div key={sub.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                            <div className="flex items-center space-x-3 min-w-0">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs md:text-sm flex-shrink-0">
                                    {sub.studentName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                     <h4 className="font-semibold text-slate-800 text-sm md:text-base truncate">{sub.studentName}</h4>
                                     <p className="text-xs text-slate-500 truncate">ID: {sub.paperId}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2 flex flex-col items-end">
                                 <div className={`font-bold text-xs md:text-sm px-2 py-1 rounded-md inline-block ${gradeColor}`}>
                                    {sub.marksObtained} / {sub.totalMarks}
                                 </div>
                                 <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-slate-400 flex items-center">
                                        <Clock className="w-3 h-3 mr-1 hidden md:inline" />
                                        {new Date(sub.timestamp).toLocaleDateString()}
                                    </span>
                                    {/* VIEW PDF BUTTON */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleViewGradedPdf(sub); }}
                                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded flex items-center border border-slate-200 transition-colors"
                                        title="View Graded PDF"
                                    >
                                        <FileCheck className="w-3 h-3 mr-1" /> View PDF
                                    </button>
                                 </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* PAPER VIEWER MODAL */}
      {selectedPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] md:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* Modal Header */}
                <div className="p-3 md:p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div className="min-w-0 pr-2">
                        <h2 className="text-base md:text-xl font-bold text-slate-800 truncate">{selectedPaper.testName}</h2>
                        <p className="text-xs text-slate-500 truncate">{selectedPaper.schoolName} • {selectedPaper.subject}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button 
                            onClick={() => downloadPDF(selectedPaper)}
                            className="flex items-center gap-1 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs md:text-sm font-medium shadow-sm"
                        >
                            <Download className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden md:inline">Download PDF</span>
                        </button>
                        <button 
                            onClick={() => setSelectedPaper(null)}
                            className="p-1.5 md:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button 
                        onClick={() => setViewerTab('QP')}
                        className={`flex-1 py-2 md:py-3 text-xs md:text-sm font-bold text-center border-b-2 transition-colors ${viewerTab === 'QP' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Question Paper
                    </button>
                    <button 
                        onClick={() => setViewerTab('AK')}
                        className={`flex-1 py-2 md:py-3 text-xs md:text-sm font-bold text-center border-b-2 transition-colors ${viewerTab === 'AK' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Answer Key
                    </button>
                </div>

                {/* Content */}
                <div 
                    className="flex-1 overflow-y-auto p-4 md:p-8 bg-white scrollbar-thin scrollbar-thumb-slate-200"
                    ref={modalContentRef}
                >
                    <div className="prose prose-sm md:prose-base max-w-none text-slate-800 
                        [&_h3]:text-base md:[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:uppercase [&_h3]:border-b [&_h3]:border-slate-200 [&_h3]:pb-1
                        [&_ol]:list-decimal [&_ol]:pl-5 md:[&_ol]:pl-6 [&_ol]:mb-4 
                        [&_li]:mb-2 md:[&_li]:mb-3 [&_li]:pl-1
                        [&_p]:mb-3 leading-relaxed text-justify"
                    >
                        <div dangerouslySetInnerHTML={{ __html: viewerTab === 'QP' ? selectedPaper.questions : selectedPaper.answerKey }}></div>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;