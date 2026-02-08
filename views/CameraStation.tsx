import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Camera, CheckCircle, RefreshCcw, Maximize2, XCircle, Aperture, Save, User, FileText, Trash2, Hash, BookOpen, Clock, Award, PlayCircle } from 'lucide-react';
import { getPapers, saveAnswerSheet } from '../services/storage';
import { QuestionPaper, AnswerSheet } from '../types';
import { generateRawPDF } from '../services/pdfUtils';

const CameraStation: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [captures, setCaptures] = useState<string[]>([]);
  const [isStable, setIsStable] = useState(false);
  const [stabilityScore, setStabilityScore] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [readyToScan, setReadyToScan] = useState(true);

  // Session State
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentRollNo, setStudentRollNo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Stability Detection Logic refs
  const lastFrameData = useRef<Uint8ClampedArray | null>(null);
  const frameRequest = useRef<number | null>(null);

  useEffect(() => {
    setPapers(getPapers());
  }, []);

  const selectedPaper = useMemo(() => 
    papers.find(p => p.id === selectedPaperId), 
  [papers, selectedPaperId]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
        setReadyToScan(true);
      }
    } catch (err) {
      console.error("Camera Error", err);
      alert("Could not access camera. Please ensure permissions are granted.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setIsActive(false);
    }
    if (frameRequest.current) cancelAnimationFrame(frameRequest.current);
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Capture at a reasonable resolution for Storage/AI (Max width 1024)
    const MAX_WIDTH = 1024;
    const scale = Math.min(1, MAX_WIDTH / videoRef.current.videoWidth);
    
    canvasRef.current.width = videoRef.current.videoWidth * scale;
    canvasRef.current.height = videoRef.current.videoHeight * scale;
    
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

    // Compress to JPEG 0.6 to save space
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6);
    setCaptures(prev => [...prev, dataUrl]);
    
    // Reset stability and Lock scanning
    setStabilityScore(0);
    setIsStable(false);
    setReadyToScan(false);
  };

  const handleNextScan = () => {
      setStabilityScore(0);
      setReadyToScan(true);
      lastFrameData.current = null; // Reset frame comparison to prevent instant high stability from previous frame
  };

  // Keyboard shortcut for Next Scan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (isActive && !readyToScan && (e.code === 'Space' || e.code === 'Enter')) {
            e.preventDefault();
            handleNextScan();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, readyToScan]);

  useEffect(() => {
    if (!isActive) return;

    const checkStability = () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      // If not ready to scan, skip processing to save resources and prevent background updates
      if (!readyToScan) {
         frameRequest.current = requestAnimationFrame(checkStability);
         return;
      }

      const width = 320; // Downscale for performance check
      const height = 240;
      
      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      
      ctx.drawImage(videoRef.current, 0, 0, width, height);
      const currentFrame = ctx.getImageData(0, 0, width, height).data;

      if (lastFrameData.current) {
        let diff = 0;
        // Sample pixels to calculate difference
        for (let i = 0; i < currentFrame.length; i += 80) {
           diff += Math.abs(currentFrame[i] - lastFrameData.current[i]);
        }
        
        // If difference is low, increment stability
        if (diff < 50000) { 
           setStabilityScore(prev => Math.min(prev + 2, 100));
        } else {
           setStabilityScore(0);
        }
      }

      lastFrameData.current = currentFrame;
      frameRequest.current = requestAnimationFrame(checkStability);
    };

    frameRequest.current = requestAnimationFrame(checkStability);

    return () => {
      if (frameRequest.current) cancelAnimationFrame(frameRequest.current);
    };
  }, [isActive, readyToScan]);

  useEffect(() => {
    if (stabilityScore >= 100 && !isStable && readyToScan) {
        setIsStable(true);
        captureFrame();
    } else if (stabilityScore < 50) {
        setIsStable(false);
    }
  }, [stabilityScore, isStable, readyToScan]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleSaveSession = () => {
    if (!selectedPaperId || !studentName.trim()) {
        alert("Please select a paper and enter student details.");
        return;
    }
    if (captures.length === 0) {
        alert("No pages scanned.");
        return;
    }

    setIsSaving(true);
    try {
        const sheet: AnswerSheet = {
            id: Math.random().toString(36).substring(7),
            paperId: selectedPaperId,
            studentName: studentName,
            rollNo: studentRollNo,
            pages: captures, // We keep base64 for AI processing flexibility
            timestamp: Date.now(),
            status: 'scanned'
        };
        saveAnswerSheet(sheet);
        
        // Generate PDF download for user immediately
        const filename = `${studentName.replace(/\s+/g, '_')}_${selectedPaper?.testName.replace(/\s+/g, '_') || 'test'}.pdf`;
        generateRawPDF(captures, filename);

        setCaptures([]);
        setStudentName('');
        setStudentRollNo('');
        setReadyToScan(true); // Reset for next student
        alert("Answer Sheet Saved & PDF Downloaded! Go to Evaluator to grade.");
    } catch (e) {
        console.error(e);
        alert("Error saving: " + e);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header */}
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shadow-lg z-10 flex-shrink-0">
        <h2 className="text-base md:text-xl font-bold flex items-center text-slate-100">
            <Aperture className="mr-3 text-indigo-400 w-5 h-5 md:w-6 md:h-6" /> Auto-Capture
        </h2>
        <div className="space-x-3">
            {!isActive ? (
                <button onClick={startCamera} className="bg-indigo-600 text-white px-3 py-1.5 md:px-5 md:py-2 rounded-full hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/50 font-medium text-xs md:text-sm flex items-center">
                    <Camera className="w-4 h-4 mr-2" /> Start
                </button>
            ) : (
                <button onClick={stopCamera} className="bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-1.5 md:px-5 md:py-2 rounded-full hover:bg-red-500/30 transition-colors font-medium text-xs md:text-sm flex items-center">
                    <XCircle className="w-4 h-4 mr-2" /> Stop
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Viewfinder - Responsive Flex Split */}
        <div className="md:flex-1 h-[50vh] md:h-full bg-black relative flex items-center justify-center overflow-hidden flex-shrink-0">
            {!isActive && (
                <div className="text-center text-slate-500">
                    <Camera className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">Camera is offline</p>
                </div>
            )}
            <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-contain ${isActive ? 'block' : 'hidden'}`} />
            
            {/* Overlays */}
            {isActive && (
                <>
                    {/* Grid Lines */}
                    <div className="absolute inset-0 pointer-events-none opacity-20">
                        <div className="w-full h-full border-2 border-white/50 box-border"></div>
                        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50"></div>
                        <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/50"></div>
                        <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50"></div>
                        <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/50"></div>
                    </div>

                    {/* Scan Paused / Next Overlay */}
                    {!readyToScan && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center animate-in fade-in duration-200 p-4 text-center">
                            <CheckCircle className="w-16 h-16 md:w-20 md:h-20 text-emerald-400 mb-6 drop-shadow-lg" />
                            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Page Captured</h3>
                            <p className="text-slate-300 mb-8 text-sm md:text-lg">Flip the page and click below to continue</p>
                            
                            <button 
                                onClick={handleNextScan}
                                className="group relative bg-white text-indigo-900 px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center"
                            >
                                <PlayCircle className="w-5 h-5 md:w-6 md:h-6 mr-3 text-indigo-600 group-hover:text-indigo-800" />
                                Scan Next Page <span className="hidden md:inline ml-3 text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">Spacebar</span>
                            </button>
                        </div>
                    )}

                    {/* Stability Indicator - Only show if ready to scan */}
                    {readyToScan && (
                        <div className="absolute top-4 right-4 md:top-6 md:right-6 flex flex-col items-end pointer-events-none">
                             <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full backdrop-blur-md border ${stabilityScore >= 95 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-900/40 border-slate-700 text-slate-300'}`}>
                                 <div className={`w-2 h-2 rounded-full ${stabilityScore >= 95 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-amber-400 animate-pulse'}`}></div>
                                 <span className="text-[10px] md:text-xs font-mono font-bold tracking-wider">
                                     {stabilityScore >= 95 ? 'STABLE' : 'STABILIZING'}
                                 </span>
                             </div>
                             <div className="mt-2 w-24 md:w-32 h-1 bg-slate-700/50 rounded-full overflow-hidden backdrop-blur">
                                <div 
                                    className={`h-full transition-all duration-200 ${stabilityScore >= 95 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                    style={{width: `${stabilityScore}%`}}
                                ></div>
                             </div>
                        </div>
                    )}

                    {/* Scanning Text */}
                    {readyToScan && stabilityScore >= 95 && (
                        <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 text-emerald-400 font-mono text-xs md:text-sm tracking-[0.2em] animate-pulse">
                            CAPTURING...
                        </div>
                    )}
                </>
            )}
            
            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Sidebar */}
        <div className="flex-1 md:flex-none w-full md:w-80 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden shadow-2xl z-20 h-[50vh] md:h-auto">
            
            {/* Session Configuration - Collapsible on small screens? Kept simple for now */}
            <div className="p-4 bg-slate-900/50 space-y-3 md:space-y-4 border-b border-slate-700 overflow-y-auto max-h-[40vh] md:max-h-none flex-shrink-0">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session Details</h3>
                
                {/* Paper Selection */}
                <div className="space-y-2">
                    <label className="text-xs text-slate-500 flex items-center"><FileText className="w-3 h-3 mr-1" /> Select Paper</label>
                    <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                        value={selectedPaperId}
                        onChange={(e) => setSelectedPaperId(e.target.value)}
                    >
                        <option value="">-- Select --</option>
                        {papers.map(p => (
                            <option key={p.id} value={p.id}>{p.testName}</option>
                        ))}
                    </select>
                </div>
                
                {/* Student Inputs */}
                {selectedPaperId && (
                    <div className="space-y-3 pt-2 border-t border-slate-700 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1.5">
                            <label className="text-xs text-slate-500 flex items-center"><Hash className="w-3 h-3 mr-1" /> Student Roll No</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-indigo-500 placeholder-slate-600"
                                placeholder="e.g. 101"
                                value={studentRollNo}
                                onChange={(e) => setStudentRollNo(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-slate-500 flex items-center"><User className="w-3 h-3 mr-1" /> Student Name</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-indigo-500 placeholder-slate-600"
                                placeholder="e.g. Rahul Patil"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="p-2 bg-slate-800 border-b border-slate-700 font-semibold text-sm text-slate-300 flex justify-between items-center flex-shrink-0">
                <span>Scanned Pages</span>
                <span className="bg-slate-700 px-2 py-0.5 rounded-md text-xs">{captures.length}</span>
            </div>

            {/* Gallery */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent min-h-0">
                {captures.length === 0 && (
                    <div className="text-center mt-4 md:mt-10 text-slate-600">
                        <Maximize2 className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No pages yet.</p>
                        <p className="text-xs mt-2 text-slate-500">Hold document steady to capture</p>
                    </div>
                )}
                {captures.map((img, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-600 shadow-md transition-transform hover:scale-[1.02]">
                        <img src={img} alt={`Scan ${idx}`} className="w-full h-auto opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 flex justify-between items-center px-2">
                             <p className="text-[10px] text-slate-300 font-mono">Page {idx + 1}</p>
                             <button onClick={() => setCaptures(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300">
                                <Trash2 className="w-3 h-3" />
                             </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Actions */}
            <div className="p-4 border-t border-slate-700 bg-slate-800/50 space-y-3 flex-shrink-0 mb-safe-area pb-8 md:pb-4">
                {captures.length > 0 && (
                     <button onClick={() => setCaptures([])} className="w-full py-2 text-slate-400 text-sm hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center">
                        <RefreshCcw className="w-3 h-3 mr-2" /> Discard All
                    </button>
                )}
                <button 
                    onClick={handleSaveSession}
                    disabled={captures.length === 0 || isSaving}
                    className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all flex items-center justify-center
                        ${captures.length > 0 && selectedPaperId && studentName 
                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20 hover:-translate-y-0.5' 
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                    `}
                >
                    {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save & Download PDF</>}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CameraStation;