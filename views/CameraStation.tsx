import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Camera, CheckCircle, RefreshCcw, Maximize2, XCircle, Aperture, Save, User, FileText, Trash2, Hash, BookOpen, Clock, Award, PlayCircle, Upload } from 'lucide-react';
import { getPapers, saveAnswerSheet } from '../services/storage';
import { QuestionPaper, AnswerSheet } from '../types';
import { generateRawPDF } from '../services/pdfUtils';

const CameraStation: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // If camera access fails (common in Streamlit iframes without permission), notify user
      alert("Camera access denied. Please use the 'Upload / Mobile Camera' button.");
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
      lastFrameData.current = null;
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

  // Stability Check Loop
  useEffect(() => {
    if (!isActive) return;

    const checkStability = () => {
      if (!videoRef.current || !canvasRef.current) return;
      if (!readyToScan) {
         frameRequest.current = requestAnimationFrame(checkStability);
         return;
      }

      const width = 320; 
      const height = 240;
      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      
      ctx.drawImage(videoRef.current, 0, 0, width, height);
      const currentFrame = ctx.getImageData(0, 0, width, height).data;

      if (lastFrameData.current) {
        let diff = 0;
        for (let i = 0; i < currentFrame.length; i += 80) {
           diff += Math.abs(currentFrame[i] - lastFrameData.current[i]);
        }
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

  // Trigger capture when stable
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
            pages: captures,
            timestamp: Date.now(),
            status: 'scanned'
        };
        saveAnswerSheet(sheet);
        
        const filename = `${studentName.replace(/\s+/g, '_')}_${selectedPaper?.testName.replace(/\s+/g, '_') || 'test'}.pdf`;
        generateRawPDF(captures, filename);

        setCaptures([]);
        setStudentName('');
        setStudentRollNo('');
        setReadyToScan(true);
        alert("Answer Sheet Saved & PDF Downloaded! Go to Evaluator to grade.");
    } catch (e) {
        console.error(e);
        alert("Error saving: " + e);
    } finally {
        setIsSaving(false);
    }
  };

  // Fallback: File Input for Mobile/Iframe
  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result) {
                  setCaptures(prev => [...prev, event.target!.result as string]);
              }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header */}
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shadow-lg z-10 flex-shrink-0">
        <h2 className="text-base md:text-xl font-bold flex items-center text-slate-100">
            <Aperture className="mr-3 text-indigo-400 w-5 h-5 md:w-6 md:h-6" /> Auto-Capture
        </h2>
        <div className="space-x-3 flex items-center">
             {/* Native File/Camera Input for compatibility */}
             <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleNativeCameraCapture}
             />
             <button 
                onClick={() => fileInputRef.current?.click()} 
                className="bg-slate-700 text-white px-3 py-1.5 rounded-full hover:bg-slate-600 transition-colors text-xs md:text-sm font-medium flex items-center gap-2"
             >
                <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Upload/Mobile Cam</span>
             </button>

             {!isActive ? (
                <button 
                    onClick={startCamera}
                    className="bg-emerald-600 text-white px-3 py-1.5 rounded-full hover:bg-emerald-500 transition-colors text-xs md:text-sm font-medium flex items-center gap-2 shadow-emerald-900/50 shadow-lg"
                >
                    <PlayCircle className="w-4 h-4" /> Start Camera
                </button>
             ) : (
                <button 
                    onClick={stopCamera}
                    className="bg-red-600 text-white px-3 py-1.5 rounded-full hover:bg-red-500 transition-colors text-xs md:text-sm font-medium flex items-center gap-2"
                >
                   <XCircle className="w-4 h-4" /> Stop
                </button>
             )}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Main Viewfinder Area */}
        <div className="flex-1 relative bg-black flex flex-col items-center justify-center p-4">
            
            {/* Camera View */}
            {isActive ? (
                <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-slate-700">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover"
                    />
                    
                    {/* Stability Overlay */}
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center space-x-2 border border-white/10">
                        <div className={`w-2 h-2 rounded-full ${isStable ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-amber-400 animate-pulse'}`}></div>
                        <span className={`text-xs font-mono font-bold ${isStable ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {isStable ? 'STABLE' : `ALIGNING ${Math.floor(stabilityScore)}%`}
                        </span>
                    </div>

                    {/* Scanning Feedback Overlay */}
                    {!readyToScan && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-20">
                            <div className="text-center">
                                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-2 animate-bounce" />
                                <h3 className="text-xl font-bold text-white">Scanned!</h3>
                                <p className="text-slate-300 text-sm mt-1">Press Space for next page</p>
                                <button 
                                    onClick={handleNextScan}
                                    className="mt-4 bg-white text-slate-900 px-6 py-2 rounded-full font-bold hover:bg-slate-200 transition-colors flex items-center mx-auto"
                                >
                                    <RefreshCcw className="w-4 h-4 mr-2" /> Scan Next Page
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Helper Grid */}
                    <div className="absolute inset-0 border-2 border-white/20 pointer-events-none grid grid-cols-3 grid-rows-3">
                         <div className="border-r border-b border-white/10"></div>
                         <div className="border-r border-b border-white/10"></div>
                         <div className="border-b border-white/10"></div>
                         <div className="border-r border-b border-white/10"></div>
                         <div className="border-r border-b border-white/10 flex items-center justify-center">
                             <div className="w-8 h-8 border border-white/30 rounded-full flex items-center justify-center">
                                 <div className="w-1 h-1 bg-white rounded-full"></div>
                             </div>
                         </div>
                         <div className="border-b border-white/10"></div>
                         <div className="border-r border-white/10"></div>
                         <div className="border-r border-white/10"></div>
                         <div></div>
                    </div>
                </div>
            ) : (
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-slate-800/50">
                        <Camera className="w-8 h-8 text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-300">Camera Inactive</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Start the camera to begin auto-scanning answer sheets. 
                        Ensure good lighting and hold the camera steady above the paper.
                        <br/><br/>
                        <span className="text-indigo-400">Note:</span> If camera fails, use the "Upload" button above.
                    </p>
                </div>
            )}
            
            {/* Hidden Canvas for Processing */}
            <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Sidebar Controls / Session Info */}
        <div className="w-full md:w-80 bg-slate-800 border-l border-slate-700 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-slate-700">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Session Details</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-500 mb-1.5 block flex items-center"><FileText className="w-3 h-3 mr-1" /> Target Paper</label>
                        <select 
                            value={selectedPaperId}
                            onChange={(e) => setSelectedPaperId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">-- Select Paper --</option>
                            {papers.map(p => (
                                <option key={p.id} value={p.id}>{p.testName} (Std {p.std})</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-xs text-slate-500 mb-1.5 block flex items-center"><User className="w-3 h-3 mr-1" /> Student Name</label>
                            <input 
                                type="text"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                placeholder="Enter Name"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                         </div>
                         <div>
                            <label className="text-xs text-slate-500 mb-1.5 block flex items-center"><Hash className="w-3 h-3 mr-1" /> Roll No</label>
                            <input 
                                type="text"
                                value={studentRollNo}
                                onChange={(e) => setStudentRollNo(e.target.value)}
                                placeholder="Optional"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                         </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scanned Pages ({captures.length})</h3>
                    {captures.length > 0 && (
                        <button onClick={() => setCaptures([])} className="text-xs text-red-400 hover:text-red-300">Clear All</button>
                    )}
                </div>
                
                {captures.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl">
                        <p className="text-slate-600 text-xs">Pages will appear here</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {captures.map((img, idx) => (
                            <div key={idx} className="relative group aspect-[3/4] rounded-lg overflow-hidden border border-slate-600 bg-black">
                                <img src={img} className="w-full h-full object-cover" />
                                <div className="absolute top-1 left-1 bg-black/60 px-1.5 rounded text-[10px] font-mono">{idx + 1}</div>
                                <button 
                                    onClick={() => setCaptures(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute top-1 right-1 p-1 bg-red-500/80 rounded hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 bg-slate-800 border-t border-slate-700">
                <button 
                    onClick={handleSaveSession}
                    disabled={isSaving || captures.length === 0}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center transition-all ${
                        isSaving || captures.length === 0
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 hover:-translate-y-1'
                    }`}
                >
                    {isSaving ? (
                        <span className="animate-pulse">Saving...</span>
                    ) : (
                        <>
                            <Save className="w-5 h-5 mr-2" /> Save Answer Sheet
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CameraStation;
