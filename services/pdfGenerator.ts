..i/**
 * PDF Report Generator for EduTrack
 * Generates comprehensive PDF reports for students
 */

interface ReportData {
  studentName: string;
  className: string;
  matricule?: string;
  generatedDate: string;
  overallAverage: number;
  attendanceRate: number;
  subjectAverages: { subject: string; average: number; grade: string }[];
  grades: { subject: string; grade: number; date: string; comment?: string }[];
  quizzes: { title: string; chapter: string; score: number; correctAnswers: number; totalQuestions: number }[];
  attendance: { date: string; status: string; notes?: string }[];
  messages: { sender: string; text: string; date: string }[];
  notifications: { title: string; description: string; date: string; type: string }[];
}

export const generatePDFReport = (data: ReportData): void => {
  // Create a new window with the report content
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Veuillez autoriser les pop-ups pour télécharger le rapport.');
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport - ${data.studentName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-break { page-break-before: always; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body class="bg-white text-slate-800 p-8 max-w-4xl mx-auto">
  <!-- Header -->
  <div class="bg-indigo-600 text-white p-8 rounded-3xl mb-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-black">EduTrack Pro</h1>
        <p class="text-indigo-200 text-sm mt-1">Rapport de suivi scolaire</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-indigo-200">Généré le</p>
        <p class="font-bold">${data.generatedDate}</p>
      </div>
    </div>
  </div>

  <!-- Student Info -->
  <div class="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
    <h2 class="text-xl font-black text-slate-800 mb-4">Informations de l'élève</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <p class="text-xs text-slate-500 uppercase tracking-widest">Nom</p>
        <p class="font-bold text-slate-800">${data.studentName}</p>
      </div>
      <div>
        <p class="text-xs text-slate-500 uppercase tracking-widest">Classe</p>
        <p class="font-bold text-slate-800">${data.className}</p>
      </div>
      <div>
        <p class="text-xs text-slate-500 uppercase tracking-widest">Matricule</p>
        <p class="font-bold text-slate-800">${data.matricule || '-'}</p>
      </div>
      <div>
        <p class="text-xs text-slate-500 uppercase tracking-widest">Moyenne générale</p>
        <p class="font-bold text-indigo-600">${data.overallAverage.toFixed(1)}/20</p>
      </div>
    </div>
  </div>

  <!-- Key Stats -->
  <div class="grid grid-cols-3 gap-4 mb-8">
    <div class="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
      <p class="text-xs text-emerald-600 uppercase tracking-widest font-black">Présence</p>
      <p class="text-3xl font-black text-emerald-700 mt-1">${data.attendanceRate}%</p>
    </div>
    <div class="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
      <p class="text-xs text-indigo-600 uppercase tracking-widest font-black">Quiz faits</p>
      <p class="text-3xl font-black text-indigo-700 mt-1">${data.quizzes.length}</p>
    </div>
    <div class="bg-amber-50 p-4 rounded-2xl border border-amber-100">
      <p class="text-xs text-amber-600 uppercase tracking-widest font-black">Notes</p>
      <p class="text-3xl font-black text-amber-700 mt-1">${data.grades.length}</p>
    </div>
  </div>

  <!-- Subject Averages -->
  <div class="mb-8 page-break">
    <h2 class="text-xl font-black text-slate-800 mb-4">Moyennes par matière</h2>
    <div class="overflow-hidden rounded-2xl border border-slate-200">
      <table class="w-full">
        <thead class="bg-slate-100">
          <tr>
            <th class="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Matière</th>
            <th class="text-center py-3 px-4 text-xs font-black uppercase text-slate-600">Moyenne</th>
            <th class="text-center py-3 px-4 text-xs font-black uppercase text-slate-600">Appréciation</th>
          </tr>
        </thead>
        <tbody>
          ${data.subjectAverages.map((item, i) => `
          <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100">
            <td class="py-3 px-4 font-bold text-slate-800">${item.subject}</td>
            <td class="py-3 px-4 text-center font-black ${item.average >= 15 ? 'text-emerald-600' : item.average >= 10 ? 'text-amber-600' : 'text-rose-600'}">${item.average.toFixed(1)}/20</td>
            <td class="py-3 px-4 text-center">
              <span class="px-3 py-1 rounded-full text-xs font-black ${item.grade === 'A' ? 'bg-emerald-100 text-emerald-700' : item.grade === 'B' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}">${item.grade}</span>
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Grades Detail -->
  <div class="mb-8">
    <h2 class="text-xl font-black text-slate-800 mb-4">Détail des notes</h2>
    <div class="overflow-hidden rounded-2xl border border-slate-200">
      <table class="w-full">
        <thead class="bg-slate-100">
          <tr>
            <th class="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Matière</th>
            <th class="text-center py-3 px-4 text-xs font-black uppercase text-slate-600">Note</th>
            <th class="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Date</th>
            <th class="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Observation</th>
          </tr>
        </thead>
        <tbody>
          ${data.grades.map((g, i) => `
          <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100">
            <td class="py-3 px-4 font-bold text-slate-800">${g.subject}</td>
            <td class="py-3 px-4 text-center font-black ${g.grade >= 15 ? 'text-emerald-600' : g.grade >= 10 ? 'text-amber-600' : 'text-rose-600'}">${g.grade}/20</td>
            <td class="py-3 px-4 text-sm text-slate-600">${g.date}</td>
            <td class="py-3 px-4 text-sm text-slate-500">${g.comment || '-'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Quiz Results -->
  <div class="mb-8 page-break">
    <h2 class="text-xl font-black text-slate-800 mb-4">Résultats des quiz</h2>
    <div class="overflow-hidden rounded-2xl border border-slate-200">
      <table class="w-full">
        <thead class="bg-slate-100">
          <tr>
            <th class="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Quiz</th>
            <th class="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Chapitre</th>
            <th class="text-center py-3 px-4 text-xs font-black uppercase text-slate-600">Score</th>
            <th class="text-center py-3 px-4 text-xs font-black uppercase text-slate-600">Bonnes réponses</th>
          </tr>
        </thead>
        <tbody>
          ${data.quizzes.map((q, i) => `
          <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100">
            <td class="py-3 px-4 font-bold text-slate-800">${q.title}</td>
            <td class="py-3 px-4 text-sm text-slate-600">${q.chapter}</td>
            <td class="py-3 px-4 text-center font-black ${q.score >= 80 ? 'text-emerald-600' : q.score >= 50 ? 'text-amber-600' : 'text-rose-600'}">${q.score}%</td>
            <td class="py-3 px-4 text-center font-bold text-slate-700">${q.correctAnswers}/${q.totalQuestions}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Attendance -->
  <div class="mb-8">
    <h2 class="text-xl font-black text-slate-800 mb-4">Assiduité</h2>
    <div class="overflow-hidden rounded-2xl border border-slate-200">
      <table class="w-full">
        <thead class="bg-slate-100">
          <tr>
            <th class="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Date</th>
            <th class="text-center py-3 px-4 text-xs font-black uppercase text-slate-600">Statut</th>
            <th class="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Observation</th>
          </tr>
        </thead>
        <tbody>
          ${data.attendance.slice(0, 20).map((a, i) => `
          <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100">
            <td class="py-3 px-4 text-sm text-slate-600">${a.date}</td>
            <td class="py-3 px-4 text-center">
              <span class="px-3 py-1 rounded-full text-xs font-black ${a.status === 'present' ? 'bg-emerald-100 text-emerald-700' : a.status === 'absent' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">${a.status}</span>
            </td>
            <td class="py-3 px-4 text-sm text-slate-500">${a.notes || '-'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Footer -->
  <div class="mt-12 pt-8 border-t border-slate-200 text-center">
    <p class="text-sm text-slate-500">
      Rapport généré automatiquement par <strong class="text-indigo-600">EduTrack Pro</strong>
    </p>
    <p class="text-xs text-slate-400 mt-2">
      Document confidentiel - Usage interne uniquement
    </p>
  </div>
</body>
</html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load then print/download
  setTimeout(() => {
    printWindow.print();
    // Alternative: download as PDF (requires user to select "Save as PDF" in print dialog)
  }, 500);
};