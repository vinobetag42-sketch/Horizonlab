import { GoogleGenAI, Type } from "@google/genai";
import { Annotation } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuestionPaperContent = async (
  topic: string,
  subject: string,
  std: string,
  marks: string
): Promise<{ questions: string; answerKey: string }> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Create a professional question paper and an answer key for:
    Subject: ${subject}
    Standard: ${std}
    Topic: ${topic}
    Total Marks: ${marks}
    
    Format requirements:
    1. Output strictly valid JSON.
    2. Use LaTeX for math equations (wrapped in $...$ or $$...$$).
    3. If the language is Marathi or Hindi, use Unicode text.
    4. **IMPORTANT**: Return the content as structured **HTML strings** (NOT Markdown).
       - Use <h3> for Section headers (e.g., "Section A", "Q.1").
       - Use <ol type="1"> for the main list of questions.
       - Use <li> for each question.
       - **MCQ Formatting**: For Multiple Choice Questions, do NOT use standard list bullets/numbers for the options. 
         Use a <ul style="list-style-type: none; padding-left: 20px;">. 
         Inside the list items, MANUALLY prefix the text with "a) ", "b) ", "c) ", "d) ".
         Example: <li>a) Option One</li>
       - **Marks Formatting**: Every question must have marks assigned. Display the marks at the extreme right of the question text line (before any options). Use exactly this inline style: <span style="float: right; font-weight: bold;">({marks})</span>.
       - Use <p> for descriptions.
       - Ensure proper spacing between questions.
    5. **CRITICAL**: Do NOT include a document header (School Name, Subject, Time, etc.) in the HTML. Start directly with the questions/instructions.
    6. The structure should be:
    {
      "questions": "HTML string of the full question paper body...",
      "answerKey": "HTML string of the full answer key..."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: { type: Type.STRING },
            answerKey: { type: Type.STRING }
          },
          required: ["questions", "answerKey"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("Failed to generate paper. Please try again.");
  }
};

export const evaluatePaper = async (
  imagesBase64: string[],
  answerKey: string,
  paperId: string
): Promise<{ marksObtained: number; totalMarks: number; feedback: string; studentName: string; annotations: Annotation[] }> => {
  // We use the Pro model for high quality reasoning on handwriting
  const model = "gemini-3-pro-preview";

  const prompt = `
    You are an expert academic grader. 
    
    Task:
    1. Analyze the provided images of a student's answer sheet (there may be multiple pages).
    2. Compare it against the provided Answer Key below.
    3. Identify the student's name if written on the paper (if not found, use "Unknown Student").
    4. Verify if the paper ID (QR code context) matches ${paperId}.
    5. Grade the paper strictly but fairly.
    6. **CRITICAL**: Provide specific locations for where marks are awarded or deducted so they can be annotated on a PDF.
       - Identify which PAGE the answer is on (1-based index).
       - Identify the approximate VERTICAL POSITION percentage on that page (0 = top, 100 = bottom) where the mark/comment should appear.
       - Provide a short text (e.g., "Correct (+2)", "Wrong Sign (-1)").

    Answer Key Context:
    ${answerKey}

    Output JSON format:
    {
      "marksObtained": number,
      "totalMarks": number,
      "feedback": "Overall summary feedback string",
      "studentName": "string",
      "annotations": [
        {
           "page": number, 
           "text": "Short string for annotation", 
           "score": "Optional string score e.g. '2' or '0.5'",
           "vertical_position": number (0 to 100)
        }
      ]
    }
  `;

  const imageParts = imagesBase64.map(img => ({
    inlineData: {
        mimeType: "image/jpeg",
        data: img
    }
  }));

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          ...imageParts,
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            marksObtained: { type: Type.NUMBER },
            totalMarks: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            studentName: { type: Type.STRING },
            annotations: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        page: { type: Type.NUMBER },
                        text: { type: Type.STRING },
                        score: { type: Type.STRING },
                        vertical_position: { type: Type.NUMBER }
                    }
                }
            }
          },
          required: ["marksObtained", "totalMarks", "feedback", "studentName", "annotations"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Evaluation Error:", error);
    throw new Error("Failed to evaluate paper.");
  }
};