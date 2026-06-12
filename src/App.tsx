/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { RdoProvider, useRdoStore } from "./context/RdoContext";
import { AuthScreen } from "./components/AuthScreen";
import { RdoEditor } from "./components/RdoEditor";
import { RdoPrintView } from "./components/RdoPrintView";
import { RdoReport } from "./types";
import { 
  HardHat, 
  Trash2, 
  Plus, 
  Search, 
  LogOut, 
  CloudRain, 
  FileText, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  Info,
  Calendar
} from "lucide-react";

// Formatting helper
const formatDateString = (dateStr: string): string => {
  if (!dateStr) return "-";
  const dateObj = new Date(dateStr + "T12:00:00");
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
  return dateObj.toLocaleDateString("pt-BR", options);
};

const getWeekDay = (dateStr: string): string => {
  if (!dateStr) return "";
  const dateObj = new Date(dateStr + "T12:00:00");
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return weekDays[dateObj.getDay()];
};

function AppContent() {
  const { 
    user, 
    isLoading, 
    isFirebase, 
    reports, 
    currentReport, 
    setCurrentReport, 
    logout, 
    saveReport, 
    deleteReport, 
    createNewReport 
  } = useRdoStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [showPrintView, setShowPrintView] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col items-center shadow-lg max-w-sm w-full text-center">
          <HardHat className="w-12 h-12 text-[#004899] animate-spin" />
          <h3 className="text-sm font-bold text-gray-800 uppercase mt-4 tracking-wider">Diário de Obras RDO</h3>
          <p className="text-xs text-gray-500 mt-2">Carregando informações e conectando ao banco de dados...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Filter RDO reports based on search
  const filteredReports = reports.filter(r => 
    r.rdoNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.obra.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.data.includes(searchTerm)
  );

  const handleCreateNewRdo = () => {
    const freshTemplate = createNewReport();
    saveReport(freshTemplate);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setShowDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm) {
      await deleteReport(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased text-xs">
      
      {/* 1. TOP HEADER NAVIGATION - High Density Compact Format */}
      <header className="bg-white border-b border-slate-200 h-14 shrink-0 px-5 md:px-6 flex items-center justify-between no-print shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-500 text-slate-900 p-1.5 rounded flex items-center justify-center">
            <HardHat className="w-4 h-4 text-slate-900" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-slate-950 leading-none">CONSTRUTOR PRO</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">SEEL ENGENHARIA</p>
          </div>
        </div>

        {/* Database status and user info */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Acesso Engenharia</span>
            <span className="text-xs font-semibold text-slate-700">{user.email}</span>
          </div>

          <div className="h-6 border-l border-slate-200 hidden sm:block"></div>

          {isFirebase ? (
            <div className="bg-green-50 border border-green-150 px-2.5 py-0.5 rounded text-[10px] font-bold text-green-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              SINCRONIZADO (FIREBASE)
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded text-[10px] font-bold text-amber-800 flex items-center gap-1" title="Seu diário é salvo com segurança no LocalStorage do seu navegador">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              LOCAL RASCUNHO
            </div>
          )}

          <button
            onClick={() => logout()}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
            title="Sair da conta"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. BODY GENERAL CONTAINER */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* SIDEBAR: HISTORY LOG LIST (Left column) - Slate-900 High Density */}
        <aside className="w-72 bg-slate-900 flex flex-col shrink-0 overflow-y-auto border-r border-slate-950 no-print text-slate-300">
          
          {/* Create Button & Search bar */}
          <div className="p-4 border-b border-slate-800 space-y-3 shrink-0 bg-slate-950/40">
            <button
              onClick={handleCreateNewRdo}
              className="w-full h-9 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs tracking-wide flex items-center justify-center gap-1.5 transition-all shadow-sm outline-none"
            >
              <Plus className="w-4 h-4 text-yellow-100" />
              NOVO DIÁRIO DE OBRA (RDO)
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar histórico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border-none rounded text-xs py-1.5 pl-9 pr-3 text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          {/* History listing log */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-2 bg-slate-950/70 text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-850">
              <span>Registros Recentes</span>
              <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono text-[9px]">{filteredReports.length}</span>
            </div>

            <div className="divide-y divide-slate-800/50">
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => {
                  const isSelected = currentReport?.id === report.id;
                  const totalRain = report.precipitacao?.total || 0;
                  
                  return (
                    <div
                      key={report.id}
                      onClick={() => {
                        setCurrentReport(report);
                        setShowPrintView(false);
                      }}
                      className={`px-4 py-3.5 cursor-pointer transition-all border-l-4 relative ${
                        isSelected 
                          ? "bg-amber-500/10 border-amber-500" 
                          : "border-transparent hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-xs font-bold font-mono tracking-wider ${isSelected ? "text-white" : "text-slate-300"}`}>
                          {report.rdoNo}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 leading-none ${
                          isSelected ? "text-amber-300 bg-amber-500/10" : "text-slate-400 bg-slate-850"
                        }`}>
                          <Calendar className={`w-3 h-3 ${isSelected ? "text-amber-400" : "text-slate-500"}`} />
                          {getWeekDay(report.data).toUpperCase()}
                        </span>
                      </div>

                      <p className={`text-[11px] font-semibold truncate mt-1 ${isSelected ? "text-amber-100" : "text-slate-400"}`}>
                        {report.obra || "Sem especificação"}
                      </p>

                      <div className="flex items-center justify-between mt-2.5 text-[9px] text-slate-500 font-mono">
                        <span>{formatDateString(report.data)}</span>
                        
                        <div className="flex items-center gap-1.5">
                          {totalRain > 0 && (
                            <span className={`flex items-center gap-0.5 font-semibold px-1 rounded ${
                              isSelected ? "text-blue-300 bg-blue-500/10" : "text-blue-400 bg-slate-850"
                            }`}>
                              <CloudRain className="w-3 h-3" />
                              {totalRain}mm
                            </span>
                          )}
                          <button
                            onClick={(e) => handleDeleteClick(e, report.id!)}
                            className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                            title="Excluir do histórico"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs italic space-y-1">
                  <FileText className="w-7 h-7 text-slate-700 mx-auto" />
                  <p>Nenhum diário encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ACTIVE WORKSPACE AREA: Form editor on select */}
        <main className="flex-1 bg-slate-50/50 overflow-y-auto p-5 no-print">
          {currentReport ? (
            <RdoEditor onShowPrint={() => setShowPrintView(true)} />
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-4 max-w-md mx-auto">
              <div className="bg-blue-50 text-blue-700 p-4 rounded-full">
                <Calendar className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800">Seja Bem-vindo ao RDO Web</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Este sistema foi modelado para preenchimento rápido e emissão do diário no formato padrão das gerenciadoras para SEEL / SABESP. Selecione um registro no histórico ou clique no botão para criar.
              </p>
              <button
                onClick={handleCreateNewRdo}
                className="bg-[#004899] hover:bg-blue-800 text-white font-semibold text-xs px-4 py-2 rounded-lg"
              >
                Criar Primeiro Relatório
              </button>
            </div>
          )}
        </main>
      </div>

      {/* 3. SHOW THE PRISTINE PRINT OVERLAY */}
      {showPrintView && currentReport && (
        <RdoPrintView 
          report={currentReport} 
          onClose={() => setShowPrintView(false)} 
        />
      )}

      {/* 4. MODAL DELETE CONFIRMATION */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border p-5 max-w-sm w-full shadow-xl space-y-4">
            <h4 className="font-bold text-gray-900">Excluir Relatório Diário de Obras?</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Tem certeza que deseja remover este registro do seu diário de obras? Esta operação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 text-xs pt-1">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-3.5 py-1.5 border border-gray-200 text-gray-600 rounded font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-semibold"
              >
                Sim, Excluir Registro
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <RdoProvider>
      <AppContent />
    </RdoProvider>
  );
}
