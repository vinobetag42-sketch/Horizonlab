import { QuestionPaper, Annotation } from '../types';
import { jsPDF } from "jspdf";

// Shared Logo
const DEFAULT_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 80'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' style='stop-color:%234F46E5;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2306B6D4;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M25 60 L45 20 L65 60' stroke='url(%23grad)' stroke-width='3' fill='none'/%3E%3Ccircle cx='45' cy='15' r='3' fill='%23F59E0B'/%3E%3Cpath d='M35 60 L45 40 L55 60' stroke='url(%23grad)' stroke-width='2' fill='none'/%3E%3Ctext x='75' y='52' font-family='sans-serif' font-weight='800' font-size='24' fill='%231E293B'%3EHORIZON%3C/text%3E%3Ctext x='205' y='52' font-family='sans-serif' font-weight='300' font-size='24' fill='%2306B6D4'%3ELAB%3C/text%3E%3C/svg%3E";

const getVerticalPosPercent = (pos: 'top' | 'middle' | 'bottom' | number): number => {
    if (typeof pos === 'number') return pos;
    switch (pos) {
        case 'top': return 10;
        case 'middle': return 50;
        case 'bottom': return 90;
        default: return 50;
    }
};

export const downloadPDF = (paper: QuestionPaper) => {
    // Open a new window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to download the PDF.");
        return;
    }

    // Prepare content strings
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${paper.id}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${paper.testName}</title>
        <style>
          body { font-family: 'Calibri', sans-serif; padding: 40px; }
          .header { text-align: center; border-bottom: 2px solid black; padding-bottom: 20px; margin-bottom: 30px; position: relative; }
          .logo { position: absolute; top: 0; left: 0; width: 100px; }
          .qr { position: absolute; top: 0; right: 0; text-align: center; }
          .qr img { width: 80px; height: 80px; }
          .qr p { margin: 2px 0 0 0; font-family: monospace; font-size: 10px; }
          h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
          h2 { margin: 5px 0 15px 0; font-size: 18px; }
          .meta { font-weight: bold; font-size: 14px; text-transform: uppercase; }
          .content h3 { font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 20px; text-transform: uppercase; }
          .content p { margin-bottom: 10px; line-height: 1.5; }
          .page-break { page-break-after: always; }
          
          /* MathJax Overrides for Print */
          mjx-container { font-size: 110% !important; }
        </style>
        <script>
        window.MathJax = {
            tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
            svg: { fontCache: 'global' }
        };
        </script>
        <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
      </head>
      <body>
        <div class="header">
          <img src="${DEFAULT_LOGO}" class="logo" />
          <div class="qr">
            <img src="${qrCodeUrl}" />
            <p>${paper.id}</p>
          </div>
          <h1>${paper.schoolName}</h1>
          <h2>${paper.testName}</h2>
          <div class="meta">
            Std: ${paper.std} | Subject: ${paper.subject} | Time: ${paper.time} | Marks: ${paper.totalMarks || 'N/A'}
          </div>
        </div>
        <div class="content">
          ${paper.questions}
        </div>

        <div class="page-break"></div>

        <div class="header">
           <h1>${paper.schoolName}</h1>
           <h2>Answer Key: ${paper.testName}</h2>
        </div>
        <div class="content">
           ${paper.answerKey}
        </div>
        <script>
          // Auto print when MathJax is ready
          window.MathJax.startup.promise.then(() => {
             setTimeout(() => { window.print(); window.close(); }, 1000);
          });
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};

export const generateRawPDF = (images: string[], filename: string) => {
    const doc = new jsPDF();
    
    images.forEach((img, index) => {
        if (index > 0) doc.addPage();
        
        const props = doc.getImageProperties(img);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (props.height * pdfWidth) / props.width;
        
        doc.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    });
    
    doc.save(filename);
};

export const generateAnnotatedPDF = (images: string[], annotations: Annotation[], studentName: string) => {
    const doc = new jsPDF();

    images.forEach((img, index) => {
        if (index > 0) doc.addPage();
        const pageNum = index + 1;

        // Add Image
        const props = doc.getImageProperties(img);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (props.height * pdfWidth) / props.width;
        doc.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        // Add Annotations
        const pageAnnotations = annotations.filter(a => a.page === pageNum);
        
        pageAnnotations.forEach(ann => {
            // Calculate Y position based on percentage (0-100)
            const yPercent = getVerticalPosPercent(ann.vertical_position);
            const yPos = (yPercent / 100) * pdfHeight;
            const xPos = 10; // Left margin

            doc.setTextColor(220, 38, 38); // Red color
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            
            // Draw marker
            const text = `✔ ${ann.score ? `(${ann.score})` : ''} ${ann.text}`;
            doc.text(text, xPos, yPos);
            
            // Optional: Draw a line
            // doc.setDrawColor(220, 38, 38);
            // doc.line(xPos, yPos + 1, xPos + 50, yPos + 1);
        });
    });

    const safeName = studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeName}_graded.pdf`);
};

export const viewGradedPDF = (images: string[], annotations: Annotation[]) => {
    const doc = new jsPDF();

    images.forEach((img, index) => {
        if (index > 0) doc.addPage();
        const pageNum = index + 1;

        const props = doc.getImageProperties(img);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (props.height * pdfWidth) / props.width;
        doc.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        const pageAnnotations = annotations.filter(a => a.page === pageNum);
        
        pageAnnotations.forEach(ann => {
            const yPercent = getVerticalPosPercent(ann.vertical_position);
            const yPos = (yPercent / 100) * pdfHeight;
            const xPos = 10;

            doc.setTextColor(220, 38, 38);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            
            const text = `✔ ${ann.score ? `(${ann.score})` : ''} ${ann.text}`;
            doc.text(text, xPos, yPos);
        });
    });

    const blob = doc.output('bloburl');
    window.open(blob, '_blank');
};