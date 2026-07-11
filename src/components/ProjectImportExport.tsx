import React, { useRef } from 'react';
import { Download, Upload, Trash2, Database, AlertCircle, RefreshCw } from 'lucide-react';

interface ProjectImportExportProps {
  podcastName: string;
  participants: string;
  storageEstimate: { usedMb: number; quotaMb: number; pct: number } | null;
  pendingSessions: any[];
  isRecovering: boolean;
  isExporting: boolean;
  isImporting: boolean;
  recoverSession: (session: any) => Promise<void>;
  discardSession: (id: string) => Promise<void>;
  exportProjectToZip: () => Promise<void>;
  importProjectFromZip: (file: File) => Promise<void>;
  handleClearProject: () => void;
  isDarkMode?: boolean;
}

export const ProjectImportExport: React.FC<ProjectImportExportProps> = ({
  storageEstimate,
  pendingSessions,
  isRecovering,
  isExporting,
  isImporting,
  recoverSession,
  discardSession,
  exportProjectToZip,
  importProjectFromZip,
  handleClearProject,
  isDarkMode = true
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      importProjectFromZip(e.target.files[0]);
    }
  };

  return (
    <div 
      id="project-management-section" 
      className={`border rounded-2xl p-6 shadow-xl transition-all duration-300 ${
        isDarkMode 
          ? 'bg-[#2d2d37]/45 border-zinc-700/20 text-zinc-100' 
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2 font-sans">
        <Database className="w-5 h-5 text-indigo-400" />
        <span>ניהול פרויקט וגיבויים</span>
      </h3>

      {/* Crash recovery alerts */}
      {pendingSessions.length > 0 && (
        <div className={`border rounded-xl p-4 mb-5 text-right ${
          isDarkMode 
            ? 'bg-amber-950/25 border-amber-850 text-amber-200' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <h4 className="font-bold flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <span>זוהו הקלטות שלא נשמרו כראוי (קריסת דפדפן/מערכת)</span>
          </h4>
          <p className="text-xs sm:text-sm mb-4 opacity-90">
            המערכת זיהתה {pendingSessions.length} הקלטות שבוצעו אך לא נשמרו כראוי בפרויקט עקב סגירה פתאומית של הדפדפן. באפשרותך לשחזר או למחוק אותן כעת:
          </p>
          <div className="space-y-3">
            {pendingSessions.map((session) => (
              <div 
                key={session.id} 
                className={`border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
                  isDarkMode 
                    ? 'bg-[#1c1c22] border-zinc-800' 
                    : 'bg-white border-amber-100'
                }`}
              >
                <div>
                  <span className="font-bold text-xs sm:text-sm">{session.name}</span>
                  <span className={`text-[10px] sm:text-xs block sm:inline sm:mr-3 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    {new Date(session.lastChunkAt || session.startedAt).toLocaleString('he-IL')} ({session.chunkCount || 0} מקטעים)
                  </span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    disabled={isRecovering}
                    onClick={() => recoverSession(session)}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRecovering ? 'animate-spin' : ''}`} />
                    <span>שחזר הקלטה</span>
                  </button>
                  <button
                    disabled={isRecovering}
                    onClick={() => discardSession(session.id)}
                    className={`text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer border ${
                      isDarkMode 
                        ? 'bg-zinc-850 border-zinc-700 hover:bg-zinc-800 text-zinc-300' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span>מחק</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export & Import actions */}
        <div className="flex flex-col justify-between gap-4">
          <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
            מומלץ לשמור קובץ גיבוי ZIP מקומי של הפרויקט שלכם. הגיבוי כולל את כל תצורת התסריט וקבצי הקול המקוריים, ותוכלו לטעון אותו חזרה לסטודיו בכל עת.
          </p>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportProjectToZip}
              disabled={isExporting}
              className={`flex items-center gap-2 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer ${
                isDarkMode 
                  ? 'bg-[#ffcc00] hover:bg-[#ffe066] text-zinc-900' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'מייצא פרויקט...' : 'שמירת קובץ גיבוי (ZIP)'}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className={`flex items-center gap-2 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer border ${
                isDarkMode 
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700' 
                  : 'border-slate-300 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>{isImporting ? 'טוען פרויקט...' : 'טעינת פרויקט מגיבוי (ZIP)'}</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Clear and Storage Statistics */}
        <div className={`border-t md:border-t-0 md:border-r pt-5 md:pt-0 md:pr-6 flex flex-col justify-between gap-4 ${
          isDarkMode ? 'border-zinc-800' : 'border-slate-100'
        }`}>
          <div>
            <h4 className={`text-xs sm:text-sm font-bold mb-2 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>שימוש באחסון דפדפן</h4>
            {storageEstimate ? (
              <div className="space-y-2">
                <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-[#1c1c22]' : 'bg-slate-100'}`}>
                  <div
                    style={{ width: `${Math.min(100, storageEstimate.pct)}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${storageEstimate.pct > 80 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                  />
                </div>
                <div className={`flex items-center justify-between text-xs font-mono ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                  <span>בשימוש: {storageEstimate.usedMb}MB</span>
                  <span>סך הכל פנוי: {storageEstimate.quotaMb}MB</span>
                </div>
              </div>
            ) : (
              <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>לא ניתן לחשב את נפח האחסון הזמין בדפדפן זה.</p>
            )}
          </div>

          <div className={`flex items-center justify-between pt-4 border-t ${
            isDarkMode ? 'border-zinc-800' : 'border-slate-100'
          }`}>
            <span className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>התחלת פרויקט חדש לגמרי:</span>
            <button
              onClick={handleClearProject}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer border ${
                isDarkMode 
                  ? 'bg-rose-950/20 hover:bg-rose-950/40 border-rose-950 text-rose-300' 
                  : 'bg-rose-50 hover:bg-rose-100 border-rose-100 text-rose-700'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>איפוס פרויקט 🗑️</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
