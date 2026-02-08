import { QuestionPaper, Submission, AnswerSheet } from '../types';

const PAPERS_KEY = 'horizon_lab_papers';
const SUBMISSIONS_KEY = 'horizon_lab_submissions';
const ANSWER_SHEETS_KEY = 'horizon_lab_answer_sheets';

export const savePaper = (paper: QuestionPaper): void => {
  const existing = getPapers();
  const updated = [paper, ...existing];
  localStorage.setItem(PAPERS_KEY, JSON.stringify(updated));
};

export const getPapers = (): QuestionPaper[] => {
  const data = localStorage.getItem(PAPERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getPaperById = (id: string): QuestionPaper | undefined => {
  const papers = getPapers();
  return papers.find(p => p.id === id);
};

export const saveSubmission = (submission: Submission): void => {
  const existing = getSubmissions();
  const updated = [submission, ...existing];
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(updated));
};

export const getSubmissions = (): Submission[] => {
  const data = localStorage.getItem(SUBMISSIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getSubmissionsByPaperId = (paperId: string): Submission[] => {
  const submissions = getSubmissions();
  return submissions.filter(s => s.paperId === paperId);
};

export const saveAnswerSheet = (sheet: AnswerSheet): void => {
    const existing = getAnswerSheets();
    const updated = [sheet, ...existing];
    try {
        localStorage.setItem(ANSWER_SHEETS_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error("Storage Quota Exceeded", e);
        alert("Failed to save Answer Sheet. Storage full. Please clear old data.");
    }
};

export const getAnswerSheets = (): AnswerSheet[] => {
    const data = localStorage.getItem(ANSWER_SHEETS_KEY);
    return data ? JSON.parse(data) : [];
};

export const getAnswerSheetById = (id: string): AnswerSheet | undefined => {
    const sheets = getAnswerSheets();
    return sheets.find(s => s.id === id);
};

export const updateAnswerSheetStatus = (id: string, status: 'scanned' | 'graded'): void => {
    const sheets = getAnswerSheets();
    const updated = sheets.map(s => s.id === id ? { ...s, status } : s);
    localStorage.setItem(ANSWER_SHEETS_KEY, JSON.stringify(updated));
};