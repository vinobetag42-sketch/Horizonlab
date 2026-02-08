import React, { useState, useRef, useEffect } from 'react';
import { PaperMetadata, QuestionPaper } from '../types';
import { generateQuestionPaperContent } from '../services/gemini';
import { savePaper } from '../services/storage';
import { downloadPDF } from '../services/pdfUtils';
import { Loader2, Printer, ArrowLeft, Wand2, BookOpen, Clock, GraduationCap, School, FileText, Download } from 'lucide-react';

declare global {
  interface Window {
    MathJax: any;
  }
}

// Fallback Logo
const DEFAULT_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 80'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' style='stop-color:%234F46E5;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2306B6D4;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M25 60 L45 20 L65 60' stroke='url(%23grad)' stroke-width='3' fill='none'/%3E%3Ccircle cx='45' cy='15' r='3' fill='%23F59E0B'/%3E%3Cpath d='M35 60 L45 40 L55 60' stroke='url(%23grad)' stroke-width='2' fill='none'/%3E%3Ctext x='75' y='52' font-family='sans-serif' font-weight='800' font-size='24' fill='%231E293B'%3EHORIZON%3C/text%3E%3Ctext x='205' y='52' font-family='sans-serif' font-weight='300' font-size='24' fill='%2306B6D4'%3ELAB%3C/text%3E%3C/svg%3E";

interface InputFieldProps {
  label: string;
  name: keyof PaperMetadata;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ElementType;
  placeholder: string;
  className?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, value, onChange, icon: Icon, placeholder, className }) => (
  <div className={className}>
    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">{label}</label>
    <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="h-4 w-4" />
        </div>
        <input 
            required 
            name={name} 
            value={value} 
            onChange={onChange} 
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm text-slate-800 placeholder:text-slate-400" 
        />
    </div>
  </div>
);

const Generator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [formData, setFormData] = useState<PaperMetadata>({
    schoolName: "Horizon High School",
    testName: "Unit Test I",
    std: "10",
    subject: "Science",
    time: "1 Hour",
    topic: "Gravitation",
    totalMarks: "20"
  });

  const [generatedPaper, setGeneratedPaper] = useState<QuestionPaper | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Render MathJax when content changes in preview
  useEffect(() => {
    if (step === 'preview' && previewRef.current && window.MathJax) {
      window.MathJax.typesetPromise([previewRef.current])
        .catch((err: any) => console.error('MathJax typeset failed: ' + err.message));
    }
  }, [step, generatedPaper]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const content = await generateQuestionPaperContent(
        formData.topic,
        formData.subject,
        formData.std,
        formData.totalMarks
      );

      const newPaper: QuestionPaper = {
        id: Math.random().toString(36).substring(2, 10).toUpperCase(),
        ...formData,
        questions: content.questions,
        answerKey: content.answerKey,
        createdAt: Date.now()
      };

      setGeneratedPaper(newPaper);
      savePaper(newPaper);
      setStep('preview');
    } catch (err) {
      alert("Failed to generate paper. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-20 md:pb-8">
      <div className="mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Paper Generator</h2>
        <p className="text-slate-500 mt-1 text-sm md:text-base">Configure parameters to generate a unique test paper using AI.</p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-xl">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">Generating Paper</h2>
            <p className="text-slate-500 mb-6 max-w-sm text-center text-sm md:text-base">Gemini AI is crafting questions, formatting LaTeX, and structuring the answer key...</p>
            <div className="w-48 md:w-64 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-indigo-500 animate-pulse w-2/3 rounded-full"></div>
            </div>
        </div>
      )}

      {step === 'preview' && generatedPaper && !loading && (
        <div className="p-0">
            {/* Actions Header */}
            <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-4 z-30 gap-4">
            <button onClick={() => setStep('form')} className="flex items-center text-slate-600 hover:text-indigo-600 font-medium transition-colors text-sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Generator
            </button>
            <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-xs md:text-sm text-slate-500 mr-2 hidden sm:block">
                    Paper ID: <span className="font-mono text-slate-800">{generatedPaper.id}</span>
                </div>
                
                <button onClick={() => downloadPDF(generatedPaper)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 md:px-6 py-2.5 rounded-lg flex items-center font-medium shadow-md shadow-indigo-200 transition-all hover:shadow-lg text-sm">
                <Download className="w-4 h-4 mr-2" /> Download PDF
                </button>
            </div>
            </div>

            {/* Paper Container - PREVIEW MODE */}
            <div 
                id="printable-paper" 
                ref={previewRef} 
                className="bg-white shadow-2xl p-6 md:p-12 min-h-[29.7cm] relative mx-auto max-w-full md:max-w-[21cm]"
            >
            {/* Paper Content */}
            <div className="font-['Calibri',_'Mangal',_'Arial',_sans-serif] text-black">
                
                {/* Header Section */}
                <div className="text-center border-b-2 border-black pb-4 mb-8 relative">
                    {/* Logo */}
                    <div className="absolute top-0 left-0 hidden sm:block">
                        <img 
                            src="logo.png" 
                            alt="Logo" 
                            className="w-24 h-auto opacity-80 grayscale object-contain" 
                            onError={(e) => e.currentTarget.src = DEFAULT_LOGO} 
                        />
                    </div>

                    {/* QR Code */}
                    <div className="absolute top-0 right-0 hidden sm:block">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${generatedPaper.id}`} 
                            alt="Paper ID" 
                            className="w-20 h-20"
                        />
                        <p className="text-[10px] text-center mt-1 font-mono">{generatedPaper.id}</p>
                    </div>
                    
                    <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider mb-2 pt-2">{generatedPaper.schoolName}</h1>
                    <h2 className="text-lg md:text-xl font-semibold mb-3">{generatedPaper.testName}</h2>
                    
                    {/* Info Bar */}
                    <div className="flex flex-wrap justify-center items-center gap-3 md:gap-6 text-sm md:text-base font-bold mb-4 uppercase tracking-wide">
                        <span>Std: {generatedPaper.std}</span>
                        <span className="text-gray-400 hidden sm:inline">|</span>
                        <span>Subject: {generatedPaper.subject}</span>
                        <span className="text-gray-400 hidden sm:inline">|</span>
                        <span>Time: {generatedPaper.time}</span>
                    </div>
                </div>

                {/* Questions Section */}
                <div className="prose prose-sm md:prose-base max-w-none text-black 
                    [&_h3]:text-base md:[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:uppercase [&_h3]:border-b [&_h3]:border-gray-300 [&_h3]:pb-1
                    [&_ol]:list-decimal [&_ol]:pl-5 md:[&_ol]:pl-6 [&_ol]:mb-4 
                    [&_li]:mb-3 [&_li]:pl-1
                    [&_p]:mb-3 leading-relaxed text-justify" 
                >
                    <div dangerouslySetInnerHTML={{ __html: generatedPaper.questions }}></div>
                </div>
                
                {/* Answer Key Page Break */}
                <div className="page-break"></div>

                {/* Answer Key Header */}
                <div className="text-center border-b-2 border-black pb-4 mb-8 pt-8 mt-12 print:mt-0">
                    <h1 className="text-xl md:text-2xl font-bold uppercase">{generatedPaper.schoolName}</h1>
                    <h2 className="text-base md:text-lg font-semibold">Answer Key: {generatedPaper.testName}</h2>
                    <p className="text-xs font-mono mt-1">ID: {generatedPaper.id}</p>
                </div>

                {/* Answer Key Content */}
                <div className="prose prose-sm max-w-none text-black
                    [&_h3]:text-sm md:[&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2
                    [&_ol]:list-decimal [&_ol]:pl-5 
                    [&_li]:mb-1
                    [&_p]:mb-2"
                    dangerouslySetInnerHTML={{ __html: generatedPaper.answerKey }}>
                </div>
                
            </div>
            </div>
        </div>
      )}

      {step === 'form' && !loading && (
        <form onSubmit={handleGenerate} className="bg-white p-6 md:p-8 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 space-y-6 md:space-y-8">
            <div>
                <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Institutional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField 
                        label="School Name" 
                        name="schoolName" 
                        value={formData.schoolName} 
                        onChange={handleInputChange} 
                        icon={School} 
                        placeholder="Horizon High School" 
                    />
                    <InputField 
                        label="Test Name" 
                        name="testName" 
                        value={formData.testName} 
                        onChange={handleInputChange} 
                        icon={FileText} 
                        placeholder="Unit Test I" 
                    />
                </div>
            </div>

            <div>
                <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Test Configuration</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <InputField label="Standard" name="std" value={formData.std} onChange={handleInputChange} icon={GraduationCap} placeholder="10" />
                    <InputField label="Subject" name="subject" value={formData.subject} onChange={handleInputChange} icon={BookOpen} placeholder="Science" />
                    <InputField label="Time" name="time" value={formData.time} onChange={handleInputChange} icon={Clock} placeholder="1 Hour" />
                    <InputField label="Total Marks" name="totalMarks" value={formData.totalMarks} onChange={handleInputChange} icon={GraduationCap} placeholder="20" />
                </div>
            </div>

            <div>
            <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Content Focus</h3>
            <InputField label="Topic / Syllabus" name="topic" value={formData.topic} onChange={handleInputChange} icon={Wand2} placeholder="e.g. Thermodynamics, Linear Equations, World War II" />
            </div>

            <div className="pt-4">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 md:py-4 rounded-xl flex justify-center items-center transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 text-sm md:text-base">
                    <Wand2 className="w-5 h-5 mr-2" /> 
                    Generate Paper & Answer Key
                </button>
                <p className="text-center text-[10px] md:text-xs text-slate-400 mt-3">Powered by Gemini 1.5 Flash. Uses LaTeX for Math Rendering.</p>
            </div>
        </form>
      )}
    </div>
  );
};

export default Generator;