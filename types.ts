export enum ViewState {
  GENERATOR = 'GENERATOR',
  CAMERA = 'CAMERA',
  EVALUATOR = 'EVALUATOR',
  DASHBOARD = 'DASHBOARD'
}

export interface QuestionPaper {
  id: string; // QR Hash
  schoolName: string;
  testName: string;
  std: string;
  subject: string;
  time: string;
  totalMarks?: string;
  questions: string; // Markdown/LaTeX content
  answerKey: string; // Markdown/LaTeX content
  createdAt: number;
}

export interface Annotation {
  page: number;
  text: string;
  score?: string;
  vertical_position: 'top' | 'middle' | 'bottom' | number; // rough % estimate 0-100
}

export interface Submission {
  id: string;
  paperId: string;
  answerSheetId?: string; // Link to the source images
  studentName: string;
  marksObtained: number;
  totalMarks: number;
  feedback: string;
  annotations?: Annotation[]; // New field for PDF markings
  timestamp: number;
}

export interface AnswerSheet {
  id: string;
  paperId: string;
  studentName: string;
  rollNo?: string;
  pages: string[]; // Base64 strings
  timestamp: number;
  status: 'scanned' | 'graded';
}

export interface PaperMetadata {
  schoolName: string;
  testName: string;
  std: string;
  subject: string;
  time: string;
  topic: string;
  totalMarks: string;
}