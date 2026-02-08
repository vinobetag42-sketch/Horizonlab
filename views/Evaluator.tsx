import React, { useState, useEffect } from 'react';
import { getPapers, getPaperById, saveSubmission, getAnswerSheets, updateAnswerSheetStatus, saveAnswerSheet } from '../services/storage';
import { evaluatePaper } from '../services/gemini';
import { generateAnnotatedPDF } from '../services/pdfUtils';
import { QuestionPaper, Submission, AnswerSheet } from '../types';
import { UploadCloud, CheckCircle, AlertCircle, Loader2, FileCheck, BrainCircuit, Check, X, FileStack, Image as ImageIcon, Download } from 'lucide-react';

const Evaluator: React.FC = () => {
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [savedSheets, setSavedSheets] = useState<AnswerSheet[]>([]);
  
  // Selection States
  const [inputMode, setInputMode] = useState<'upload' | 'saved'>('saved');
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<Submission | null>(null);
  const [currentImages, setCurrentImages] = useState<string[]>([]);

  useEffect(() => {
    setPapers(getPapers());
    const sheets = getAnswerSheets().filter(s => s.status === 'scanned');
    setSavedSheets(sheets);
  }, [result]); // Refresh list after grading

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setCurrentImages([]);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1]; 
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleEvaluate = async () => {
    let targetPaperId = selectedPaperId;
    let images: string[] = [];
    let studentNameOverride = '';
    let finalAnswerSheetId = '';

    setIsProcessing(true);
    setResult(null);

    try {
      if (inputMode === 'upload') {
          if (!file || !selectedPaperId) throw new Error("Missing file or paper selection");
          const base64 = await convertToBase64(file);
          images = [base64];
      } else {
          // Saved Mode
          const sheet = savedSheets.find(s => s.id === selectedSheetId);
          if (!sheet) throw new Error("Sheet not found");
          targetPaperId = sheet.paperId;
          finalAnswerSheetId = sheet.id;
          
          // Ensure base64 strings don't have prefixes if stored with them
          images = sheet.pages.map(p => p.includes(',') ? p.split(',')[1] : p);
          studentNameOverride = sheet.studentName;
      }

      // Store images for PDF generation later
      setCurrentImages(images);

      const selectedPaper = getPaperById(targetPaperId);
      if (!selectedPaper) throw new Error("Paper not found");

      // Call Gemini Service
      const aiResult = await evaluatePaper(images, selectedPaper.answerKey, targetPaperId);

      // Post-Processing for Upload Mode: Save as AnswerSheet so we can view it later
      if (inputMode === 'upload') {
        const newSheet: AnswerSheet = {
            id: Math.random().toString(36).substring(7),
            paperId: targetPaperId,
            studentName: aiResult.studentName || "Uploaded Student",
            pages: images,
            timestamp: Date.now(),
            status: 'graded'
        };
        saveAnswerSheet(newSheet);
        finalAnswerSheetId = newSheet.id;
      } else if (inputMode === 'saved' && selectedSheetId) {
        updateAnswerSheetStatus(selectedSheetId, 'graded');
        // Prefer the name from the scanned sheet metadata if AI failed to read it properly or returned generic
        if (studentNameOverride && (aiResult.studentName === "Unknown Student" || !aiResult.studentName)) {
            aiResult.studentName = studentNameOverride;
        }
      }

      const newSubmission: Submission = {
        id: Math.random().toString(36).substring(7),
        paperId: targetPaperId,
        answerSheetId: finalAnswerSheetId,
        studentName: aiResult.studentName,
        marksObtained: aiResult.marksObtained,
        totalMarks: aiResult.totalMarks,
        feedback: aiResult.feedback,
        annotations: aiResult.annotations,
        timestamp: Date.now()
      };

      saveSubmission(newSubmission);
      setResult(newSubmission);

    } catch (error) {
      console.error(error);
      alert("Evaluation failed. Please check API Key or Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadAnnotatedPDF = () => {
      if (!result || currentImages.length === 0) return;
      generateAnnotatedPDF(currentImages, result.annotations || [], result.studentName);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-20 md:pb-8">
      <div className="mb-6 md:mb-8">
         <h2 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center tracking-tight">
            <BrainCircuit className="mr-3 text-indigo-600" /> AI Evaluator
         </h2>
         <p className="text-slate-500 mt-2 text-sm md:text-base">Upload student answer sheets or select from camera scans for instant AI-powered grading.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Input Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            
            {/* Toggle Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button 
                    onClick={() => setInputMode('saved')}
                    className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg flex items-center justify-center transition-all ${inputMode === 'saved' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <FileStack className="w-3 h-3 md:w-4 md:h-4 mr-2" /> Saved Scans ({savedSheets.length})
                </button>
                <button 
                    onClick={() => setInputMode('upload')}
                    className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg flex items-center justify-center transition-all ${inputMode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <UploadCloud className="w-3 h-3 md:w-4 md:h-4 mr-2" /> Upload File
                </button>
            </div>

            {inputMode === 'upload' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                    <label className="block text-xs md:text-sm font-bold text-slate-700 uppercase tracking-wide">Select Paper Context</label>
                    <select 
                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-700 font-medium text-sm"
                        value={selectedPaperId}
                        onChange={(e) => setSelectedPaperId(e.target.value)}
                    >
                        <option value="">-- Choose Question Paper --</option>
                        {papers.map(p => (
                            <option key={p.id} value={p.id}>{p.testName} - {p.subject}</option>
                        ))}
                    </select>

                    <label className="block text-xs md:text-sm font-bold text-slate-700 uppercase tracking-wide mt-4">Upload Image</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 hover:border-indigo-400 transition-all duration-300 relative group">
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <UploadCloud className="w-6 h-6 text-indigo-600" />
                        </div>
                        <p className="text-slate-700 font-semibold text-sm truncate px-2">
                            {file ? file.name : "Click to browse"}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                    <label className="block text-xs md:text-sm font-bold text-slate-700 uppercase tracking-wide">Pending Evaluations</label>
                    {savedSheets.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p className="text-slate-400 text-sm">No saved scans found.</p>
                            <p className="text-xs text-slate-400 mt-1">Go to Camera Station to scan papers.</p>
                        </div>
                    ) : (
                        <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto space-y-2 pr-1">
                            {savedSheets.map(sheet => {
                                const paper = getPapers().find(p => p.id === sheet.paperId);
                                const isSelected = selectedSheetId === sheet.id;
                                return (
                                    <div 
                                        key={sheet.id}
                                        onClick={() => { setSelectedSheetId(sheet.id); setResult(null); }}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">{sheet.studentName}</h4>
                                                <p className="text-xs text-slate-500 mt-1">{paper?.testName || 'Unknown Paper'}</p>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 mb-1">{sheet.pages.length} Pages</span>
                                                <span className="text-[10px] text-slate-400">{new Date(sheet.timestamp).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <button 
              onClick={handleEvaluate}
              disabled={isProcessing || (inputMode === 'upload' && (!file || !selectedPaperId)) || (inputMode === 'saved' && !selectedSheetId)}
              className={`w-full mt-6 py-3 md:py-4 rounded-xl font-bold text-white transition-all flex justify-center items-center shadow-lg
                ${isProcessing || (inputMode === 'upload' && (!file || !selectedPaperId)) || (inputMode === 'saved' && !selectedSheetId)
                    ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1 shadow-indigo-200'}
              `}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Analyzing...
                </>
              ) : (
                <>
                   Run AI Grading
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7">
            <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-slate-100 min-h-[400px] md:min-h-[500px] flex flex-col h-full">
            <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wide border-b border-slate-100 pb-4 mb-6">Evaluation Report</h3>
            
            {!result && !isProcessing && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <FileCheck className="w-8 h-8 md:w-10 md:h-10 opacity-20" />
                </div>
                <p className="font-medium text-sm md:text-base">Ready to Grade</p>
                <p className="text-xs md:text-sm mt-1 text-center">Select a scan and click Run AI Grading.</p>
                </div>
            )}

            {isProcessing && (
                <div className="space-y-6 animate-pulse mt-8 flex-1">
                    <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                    <div className="h-10 bg-slate-100 rounded w-3/4"></div>
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <div className="h-32 bg-slate-100 rounded-xl"></div>
                        <div className="h-32 bg-slate-100 rounded-xl"></div>
                    </div>
                    <div className="h-40 bg-slate-100 rounded-xl mt-4"></div>
                </div>
            )}

            {result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Info */}
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Student</span>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800">{result.studentName}</h2>
                        <p className="text-[10px] md:text-xs text-slate-500 mt-1 font-mono">ID: {result.id}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-bold text-slate-400 uppercase">Graded On</span>
                        <p className="text-sm font-semibold text-slate-600">{new Date(result.timestamp).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Score Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 md:p-5 rounded-2xl border border-emerald-100 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Check className="w-12 h-12 md:w-16 md:h-16 text-emerald-600" />
                        </div>
                        <span className="text-[10px] md:text-xs font-bold text-emerald-600 uppercase tracking-wider relative z-10">Score</span>
                        <div className="text-2xl md:text-4xl font-bold text-emerald-700 mt-1 relative z-10">
                            {result.marksObtained}
                            <span className="text-sm md:text-lg text-emerald-500/70 ml-1">/ {result.totalMarks}</span>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 md:p-5 rounded-2xl border border-indigo-100 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <BrainCircuit className="w-12 h-12 md:w-16 md:h-16 text-indigo-600" />
                        </div>
                        <span className="text-[10px] md:text-xs font-bold text-indigo-600 uppercase tracking-wider relative z-10">Percentage</span>
                        <div className="text-2xl md:text-4xl font-bold text-indigo-700 mt-1 relative z-10">
                            {((result.marksObtained / result.totalMarks) * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>

                {/* Feedback */}
                <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-200">
                    <div className="flex items-center mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Feedback Analysis</span>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                        {result.feedback}
                    </p>
                </div>

                {/* Download PDF Action */}
                <button 
                    onClick={handleDownloadAnnotatedPDF}
                    className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200 text-sm md:text-base"
                >
                    <Download className="w-4 h-4 md:w-5 md:h-5 mr-2 text-emerald-400" /> Download Graded PDF (Red Marks)
                </button>
                </div>
            )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Evaluator;