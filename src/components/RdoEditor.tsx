/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  RdoReport, 
  Activity, 
  CompanyLaborGroup, 
  EquipmentMobilizedDetail, 
  StoppageDetailRow,
  HOURS_LIST
} from "../types";
import { useRdoStore } from "../context/RdoContext";
import { 
  Save, 
  Trash2, 
  Plus, 
  Sparkles, 
  Calendar, 
  Users, 
  CloudRain, 
  Wrench, 
  FileText, 
  HelpCircle, 
  Image as ImageIcon,
  CheckCircle,
  FileSpreadsheet,
  ChevronsUpDown,
  Upload
} from "lucide-react";

interface RdoEditorProps {
  onShowPrint: () => void;
}

export const RdoEditor: React.FC<RdoEditorProps> = ({ onShowPrint }) => {
  const { currentReport, saveReport, isFirebase } = useRdoStore();
  const [activeTab, setActiveTab] = useState<"geral" | "atividades" | "paralisacoes" | "efetivo" | "equipamentos">("geral");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Drag and drop / local state representation
  const [dragActive, setDragActive] = useState<Record<string, boolean>>({});

  if (!currentReport) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center shadow-sm">
        <p className="text-gray-500 italic">Nenhum RDO carregado ou selecionado.</p>
      </div>
    );
  }

  // Quick edit wrapper
  const updateReport = (changes: Partial<RdoReport>) => {
    saveReport({
      ...currentReport,
      ...changes
    } as RdoReport);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Auto compute total labor from detailed board
      let computedMoi = 0;
      let computedMod = 0;
      currentReport.efetivoDetalhado.forEach(g => {
        g.items.forEach(itm => {
          if (itm.moiMod === "MOI") computedMoi += Number(itm.c || 0) - Number(itm.f || 0);
          if (itm.moiMod === "MOD") computedMod += Number(itm.c || 0) - Number(itm.f || 0);
        });
      });

      // Auto compute total equipment from detailed table
      const computedEqTotal = currentReport.equipamentosDetalhado.reduce((sum, q) => sum + Number(q.quantidade || 0), 0);

      const computedElapsed = Number(currentReport.prazoIncorrido || 0);
      const computedRemaining = Math.max(0, Number(currentReport.prazo || 0) - computedElapsed);

      await saveReport({
        ...currentReport,
        prazoFaltante: computedRemaining,
        efetivoSummary: {
          ...currentReport.efetivoSummary,
          moi: computedMoi,
          mod: computedMod,
          total: computedMoi + computedMod + Number(currentReport.efetivoSummary.subcontratadosMoiMod || 0)
        },
        equipamentosSummary: {
          ...currentReport.equipamentosSummary,
          total: computedEqTotal,
          mobilizados: computedEqTotal
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // List of pre-set phases to choose from for fast categorization
  const phaseCategories = [
    "ATIVIDADES - FASE 01 - REDE EXTERNA",
    "ATIVIDADES - GERÊNCIA",
    "ATIVIDADES - FASE 12 - COND. REAL PARK",
    "ATIVIDADES - ADMINISTRAÇÃO CONTRATUAL",
    "ATIVIDADES - SUPRIMENTOS",
    "ATIVIDADES - PROJETOS",
    "ATIVIDADES - PLANEJAMENTO",
    "ATIVIDADES - QSM"
  ];

  // Activities Operations
  const handleAddActivity = () => {
    const nextRef = (currentReport.atividades.length + 1).toString().padStart(3, "0");
    const newAct: Activity = {
      id: "act-added-" + Date.now(),
      ref: nextRef,
      fase: "ATIVIDADES - FASE 01 - REDE EXTERNA",
      identificador: "1.1",
      descricao: "Nova atividade descritiva do diário...",
      intervalo: "E+m",
      total: "0"
    };
    updateReport({
      atividades: [...currentReport.atividades, newAct]
    });
  };

  const handleUpdateActivity = (index: number, fields: Partial<Activity>) => {
    const updated = [...currentReport.atividades];
    updated[index] = { ...updated[index], ...fields };
    updateReport({ atividades: updated });
  };

  const handleDeleteActivity = (index: number) => {
    const updated = currentReport.atividades.filter((_, i) => i !== index);
    updateReport({ atividades: updated });
  };

  // Stoppage Operation wrapper
  const handleUpdateStoppage = (category: "chuva" | "raios" | "projetos" | "vizinhos", fields: Partial<StoppageDetailRow>) => {
    const detail = { ...currentReport.paralisacoesDetalhe };
    detail[category] = { ...detail[category], ...fields };
    
    // Recalculate paralisacoes quantities
    let totalHoursCount = 0;
    let paralisacoesCount = 0;
    Object.values(detail).forEach(r => {
      const rowItem = r as StoppageDetailRow;
      if (rowItem.ativo) {
        totalHoursCount += rowItem.horas.length;
        if (rowItem.horas.length > 0) paralisacoesCount++;
      }
    });

    updateReport({
      paralisacoesDetalhe: detail,
      paralisacoesSummary: {
        totalHorasParalisadasDia: totalHoursCount,
        numeroParalisacoes: paralisacoesCount
      }
    });
  };

  const toggleHourStoppage = (category: "chuva" | "raios" | "projetos" | "vizinhos", hour: string) => {
    const row = currentReport.paralisacoesDetalhe[category];
    const currentHours = [...row.horas];
    const hourIdx = currentHours.indexOf(hour);
    if (hourIdx > -1) {
      currentHours.splice(hourIdx, 1);
    } else {
      currentHours.push(hour);
    }
    
    // Sort logically from morning to night
    const order = [
      "6h", "7h", "8h", "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h", "18h", "19h", "20h", "21h", "22h", "23h",
      "0h", "1h", "2h", "3h", "4h", "5h"
    ];
    currentHours.sort((a,b) => order.indexOf(a) - order.indexOf(b));

    handleUpdateStoppage(category, { 
      horas: currentHours,
      total: `${currentHours.length}h`
    });
  };

  // Weather mm edits
  const handleRainMmChange = (hour: string, value: number) => {
    const updatedRain = { ...currentReport.chuvaMmPorHora };
    updatedRain[hour] = value;

    // Recalculate period totals
    let manhaTotal = 0; // 6h to 11h
    let tardeTotal = 0; // 12h to 17h
    let noiteTotal = 0; // 18h to 5h
    
    Object.entries(updatedRain).forEach(([h, val]) => {
      const num = Number(h.replace("h", ""));
      const weight = Number(val || 0);
      if (num >= 6 && num <= 11) {
        manhaTotal += weight;
      } else if (num >= 12 && num <= 17) {
        tardeTotal += weight;
      } else {
        noiteTotal += weight;
      }
    });

    const sumTotal = Number((manhaTotal + tardeTotal + noiteTotal).toFixed(2));

    updateReport({
      chuvaMmPorHora: updatedRain,
      precipitacao: {
        ...currentReport.precipitacao,
        manha: Number(manhaTotal.toFixed(2)),
        tarde: Number(tardeTotal.toFixed(2)),
        noite: Number(noiteTotal.toFixed(2)),
        total: sumTotal,
        acumuladoMes: sumTotal
      }
    });
  };

  // Detailed Labor Operations
  const handleUpdateLaborItem = (groupIndex: number, itemIndex: number, fields: Partial<any>) => {
    const updatedGrid = [...currentReport.efetivoDetalhado];
    const group = { ...updatedGrid[groupIndex] };
    const items = [...group.items];
    
    // Handle recalculation of T: total = Registered (C) minus Fails (F)
    const currentItem = { ...items[itemIndex], ...fields };
    if ("c" in fields || "f" in fields) {
      currentItem.t = Math.max(0, (currentItem.c || 0) - (currentItem.f || 0));
    }

    items[itemIndex] = currentItem;
    group.items = items;
    updatedGrid[groupIndex] = group;
    // update report state
    updateReport({ efetivoDetalhado: updatedGrid });
  };

  const handleAddLaborRow = (groupIndex: number) => {
    const updatedGrid = [...currentReport.efetivoDetalhado];
    const group = { ...updatedGrid[groupIndex] };
    const newItem = {
      id: "labor-itm-" + Date.now(),
      cargo: "Auxiliar Técnico",
      c: 0,
      f: 0,
      a: 0,
      t: 0,
      moiMod: "MOD" as const
    };
    group.items = [...group.items, newItem];
    updatedGrid[groupIndex] = group;
    updateReport({ efetivoDetalhado: updatedGrid });
  };

  const handleDeleteLaborRow = (groupIndex: number, itemIndex: number) => {
    const updatedGrid = [...currentReport.efetivoDetalhado];
    const group = { ...updatedGrid[groupIndex] };
    group.items = group.items.filter((_, i) => i !== itemIndex);
    updatedGrid[groupIndex] = group;
    updateReport({ efetivoDetalhado: updatedGrid });
  };

  // Equipment detail Operations
  const handleAddEquipmentRow = () => {
    const newItem: EquipmentMobilizedDetail = {
      id: "eq-" + Date.now(),
      descricao: "Mini Escavadeira Bobcat",
      quantidade: 1,
      empresa: "SEEL"
    };
    updateReport({
      equipamentosDetalhado: [...currentReport.equipamentosDetalhado, newItem]
    });
  };

  const handleUpdateEquipmentRow = (index: number, fields: Partial<EquipmentMobilizedDetail>) => {
    const updated = [...currentReport.equipamentosDetalhado];
    updated[index] = { ...updated[index], ...fields };
    updateReport({ equipamentosDetalhado: updated });
  };

  const handleDeleteEquipmentRow = (index: number) => {
    const updated = currentReport.equipamentosDetalhado.filter((_, i) => i !== index);
    updateReport({ equipamentosDetalhado: updated });
  };

  // Image Upload helper using FileReader base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, actIdx: number) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const currentImgs = currentReport.atividades[actIdx].imagens || [];
        if (currentImgs.length < 2) {
          handleUpdateActivity(actIdx, {
            imagens: [...currentImgs, base64String]
          });
        } else {
          // Overwrite first one
          handleUpdateActivity(actIdx, {
            imagens: [base64String, currentImgs[1]]
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent, actId: string, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [actId]: active }));
  };

  const handleDrop = (e: React.DragEvent, actIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const actId = currentReport.atividades[actIdx].id;
    setDragActive(prev => ({ ...prev, [actId]: false }));

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const currentImgs = currentReport.atividades[actIdx].imagens || [];
        handleUpdateActivity(actIdx, {
          imagens: [...currentImgs.slice(-1), base64String] // maintain max 2 images
        });
      };
      reader.readAsDataURL(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Save panel / Banner info */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-wrap gap-4 items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-500/10 text-amber-700 p-2 rounded">
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-xs uppercase tracking-tight leading-none">REGISTRO DIÁRIO DE OBRA nº {currentReport.rdoNo}</h2>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Status: <strong className="text-emerald-700 font-bold">EM DIGITAÇÃO</strong> — {formatPrintDate(currentReport.data).toUpperCase()}</p>
          </div>
        </div>

        <div className="flex gap-1.5">
          {saveSuccess && (
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded text-[10px] font-bold flex items-center animate-fade-in">
              <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Sincronizado!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-8 flex items-center gap-1 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] uppercase tracking-wide rounded transition-all shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Salvando..." : "Salvar Rascunho"}
          </button>
          
          <button
            onClick={onShowPrint}
            className="h-8 flex items-center gap-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] uppercase tracking-wide rounded transition-all shadow-xs"
          >
            Visualizar PDF
          </button>
        </div>
      </div>

      {/* TABS SELECTOR - High Density Compact Layout */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-t pt-1.5 px-1.5 gap-0.5 scrollbar-none shrink-0">
        {[
          { id: "geral", label: "Dados e Prazos", icon: Calendar },
          { id: "atividades", label: "Atividades de Campo", icon: FileText },
          { id: "paralisacoes", label: "Paralisações e Clima", icon: CloudRain },
          { id: "efetivo", label: "Quadro de Efetivo", icon: Users },
          { id: "equipamentos", label: "Equipamentos e Assinaturas", icon: Wrench },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider rounded-t transition-all focus:outline-none whitespace-nowrap border-t-2 ${
                isSelected
                  ? "bg-slate-50/50 border-t-amber-500 text-amber-500 border-x border-slate-200/60 font-black"
                  : "text-slate-500 hover:text-slate-800 bg-transparent border-t-transparent border-x border-transparent"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-amber-600" : "text-slate-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TABS CONTAINER */}
      <div className="bg-white p-5 rounded-b border border-t-0 border-slate-200 shadow-xs min-h-[460px]">
        
        {/* ================== TAB: GERAL ================== */}
        {activeTab === "geral" && (
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 font-sans">Dados Gerais e Identificação</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">RDO Código Número</label>
                <input
                  type="text"
                  value={currentReport.rdoNo}
                  onChange={(e) => updateReport({ rdoNo: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors"
                  placeholder="ex: BDG-1224"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Data do Relatório</label>
                <input
                  type="date"
                  value={currentReport.data}
                  onChange={(e) => updateReport({ data: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Nome da Obra</label>
                <input
                  type="text"
                  value={currentReport.obra}
                  onChange={(e) => updateReport({ obra: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors"
                  placeholder="BUILDING"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Cliente / Contratante Geral</label>
                <input
                  type="text"
                  value={currentReport.cliente}
                  onChange={(e) => updateReport({ cliente: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors"
                  placeholder="XWS"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Gestor Responsável</label>
                <input
                  type="text"
                  value={currentReport.gestor}
                  onChange={(e) => updateReport({ gestor: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors"
                  placeholder="João Medeiros"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Gerenciadora</label>
                <input
                  type="text"
                  value={currentReport.gerenciadora}
                  onChange={(e) => updateReport({ gerenciadora: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors"
                  placeholder="SABESP"
                />
              </div>
            </div>

            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 pt-2 font-sans">Prazo Técnico e Cronograma</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Prazo Total (dias)</label>
                <input
                  type="number"
                  value={currentReport.prazo}
                  onChange={(e) => updateReport({ prazo: Number(e.target.value) })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Prazo Incorrido (dias)</label>
                <input
                  type="number"
                  value={currentReport.prazoIncorrido}
                  onChange={(e) => updateReport({ prazoIncorrido: Number(e.target.value) })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1 bg-slate-100 px-1.5 py-0.5 rounded leading-tight">Remanescente</label>
                <input
                  type="text"
                  disabled
                  value={`${Math.max(0, (currentReport.prazo || 0) - (currentReport.prazoIncorrido || 0))} dias`}
                  className="block h-8 w-full rounded bg-slate-100 border-slate-200 font-bold text-slate-600 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Início da Obra</label>
                <input
                  type="text"
                  value={currentReport.inicio}
                  onChange={(e) => updateReport({ inicio: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors"
                  placeholder="01/01/2016"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Término Planejado</label>
                <input
                  type="text"
                  value={currentReport.termino}
                  onChange={(e) => updateReport({ termino: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors"
                  placeholder="31/12/2019"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================== TAB: ATIVIDADES ================== */}
        {activeTab === "atividades" && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 matches-pattern">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fases e Atividades Executadas (Anexar Fotos)</h3>
              <button
                onClick={handleAddActivity}
                className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider px-3 h-8 rounded transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Atividade
              </button>
            </div>

            {currentReport.atividades && currentReport.atividades.length > 0 ? (
              <div className="space-y-4">
                {currentReport.atividades.map((act, idx) => (
                  <div key={act.id || idx} className="bg-white p-4 rounded border border-slate-200 shadow-xs space-y-3">
                    <div className="flex flex-wrap gap-2.5 items-center justify-between">
                      <div className="flex gap-2 items-center flex-1">
                        <span className="font-mono text-xs font-bold text-amber-700 bg-amber-500/10 h-8 w-10 flex items-center justify-center rounded">
                          #{idx + 1}
                        </span>
                        
                        <div className="w-48">
                          <select
                            value={act.fase}
                            onChange={(e) => handleUpdateActivity(idx, { fase: e.target.value })}
                            className="block w-full h-8 rounded border-slate-300 text-xs text-slate-800 py-0.5 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/20"
                          >
                            {phaseCategories.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>

                        <div className="w-24">
                          <input
                            type="text"
                            value={act.ref}
                            onChange={(e) => handleUpdateActivity(idx, { ref: e.target.value })}
                            className="block w-full h-8 rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/20"
                            placeholder="Ref (ex 001)"
                          />
                        </div>

                        <div className="w-28">
                          <input
                            type="text"
                            value={act.identificador}
                            onChange={(e) => handleUpdateActivity(idx, { identificador: e.target.value })}
                            className="block w-full h-8 rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/20"
                            placeholder="Identificador (ex 4.2)"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteActivity(idx)}
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors"
                        title="Deletar atividade"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight">Descrição Prática do Serviço</label>
                      <textarea
                        value={act.descricao}
                        onChange={(e) => handleUpdateActivity(idx, { descricao: e.target.value })}
                        rows={2}
                        className="mt-1 block w-full rounded border-slate-300 shadow-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-slate-850 bg-slate-50/20"
                        placeholder="Ex: Escavação mecânica..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight">Unidade Intervalo</label>
                        <input
                          type="text"
                          value={act.intervalo}
                          onChange={(e) => handleUpdateActivity(idx, { intervalo: e.target.value })}
                          className="mt-1 block h-8 w-full rounded border-slate-300 text-xs text-slate-850 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/20"
                          placeholder="E+m"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight">Metragem / Total do Dia</label>
                        <input
                          type="text"
                          value={act.total}
                          onChange={(e) => handleUpdateActivity(idx, { total: e.target.value })}
                          className="mt-1 block h-8 w-full rounded border-slate-300 text-xs text-slate-850 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/20 font-mono"
                          placeholder="15"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight">Comentários Especiais</label>
                        <input
                          type="text"
                          value={act.comentario || ""}
                          onChange={(e) => handleUpdateActivity(idx, { comentario: e.target.value })}
                          className="mt-1 block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/20"
                          placeholder="Opcional..."
                        />
                      </div>
                    </div>

                    {/* PHOTO ATTACHMENT DRAG AND DROP / SELECTION */}
                    <div className="space-y-1.5 pt-1">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight">Fotos Anexas (Máximo 2 Imagens)</span>
                      
                      <div className="flex flex-wrap gap-3 items-stretch">
                        {/* Drag and drop active area */}
                        <div
                          onDragOver={(e) => handleDrag(e, act.id, true)}
                          onDragLeave={(e) => handleDrag(e, act.id, false)}
                          onDrop={(e) => handleDrop(e, idx)}
                          className={`flex-1 border border-dashed rounded p-3 flex flex-col justify-center items-center text-center transition-colors cursor-pointer ${
                            dragActive[act.id]
                              ? "border-amber-500 bg-amber-500/5 select-none"
                              : "border-slate-300 bg-slate-50 hover:bg-slate-100/50"
                          }`}
                        >
                          <input
                            type="file"
                            id={`file-${act.id}`}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, idx)}
                          />
                          <label htmlFor={`file-${act.id}`} className="cursor-pointer flex flex-col items-center">
                            <Upload className="w-5 h-5 text-slate-400 mb-1" />
                            <span className="text-[10px] font-bold text-slate-600 block leading-tight">Arraste fotos aqui ou clique para selecionar</span>
                            <span className="text-[9px] text-slate-400 font-normal leading-none mt-0.5">Suporta formatos de imagens nativos</span>
                          </label>
                        </div>

                        {/* Presets and Preview list */}
                        <div className="w-full md:w-2/3 flex gap-2">
                          {act.imagens && act.imagens.length > 0 ? (
                            act.imagens.slice(0,2).map((img, imgIdx) => (
                              <div key={imgIdx} className="relative w-1/2 aspect-[4/3] rounded border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                                <img src={img} alt="Anexo atividade" className="w-full h-full object-cover animate-fade-in" />
                                <button
                                  onClick={() => {
                                    const otherImgs = act.imagens?.filter((_, i) => i !== imgIdx) || [];
                                    handleUpdateActivity(idx, { imagens: otherImgs });
                                  }}
                                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white w-5 h-5 flex items-center justify-center rounded-full shadow-md text-xs leading-none"
                                  title="Remover imagem"
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="w-full flex items-center justify-center text-[10px] text-slate-400 border border-slate-200 bg-slate-50/50 rounded italic font-medium">
                              Sem anexos de imagem. Use os presets abaixo para simulação.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Presets Row */}
                      <div className="flex gap-2 text-[9px] items-center text-slate-500 font-medium">
                        <span className="uppercase tracking-wider font-semibold text-[8px] text-slate-400">Inserção Rápida:</span>
                        <button
                          onClick={() => {
                            const current = act.imagens || [];
                            handleUpdateActivity(idx, {
                              imagens: [...current.slice(-1), "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=400"]
                            });
                          }}
                          className="bg-amber-500/10 text-amber-700 font-bold px-2 py-0.5 rounded hover:bg-amber-500/20 transition-all cursor-pointer"
                        >
                          Concretagem
                        </button>
                        <button
                          onClick={() => {
                            const current = act.imagens || [];
                            handleUpdateActivity(idx, {
                              imagens: [...current.slice(-1), "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400"]
                            });
                          }}
                          className="bg-amber-500/10 text-amber-700 font-bold px-2 py-0.5 rounded hover:bg-amber-500/20 transition-all cursor-pointer"
                        >
                          Escavação
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center italic text-gray-500">
                Nenhuma atividade cadastrada. Use o botão no topo direito para criar!
              </div>
            )}
          </div>
        )}

        {/* ================== TAB: PARALISAÇÕES & CLIMA ================== */}
        {activeTab === "paralisacoes" && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5">Fatos Relevantes e Eventos de Obra</h3>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Anotações Extraordinárias (Um evento completo por linha)</label>
              <textarea
                value={currentReport.fatosRelevantes.join("\n")}
                onChange={(e) => updateReport({ fatosRelevantes: e.target.value.split("\n").filter(line => line.trim() !== "") })}
                rows={3}
                className="block w-full rounded border-slate-300 shadow-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-slate-800 bg-slate-50/20"
                placeholder="Insira as observações mais importantes do diário. Ex: Atraso mecânico no início do turno..."
              />
            </div>

            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 pt-2">Registro de Horas por Tipo de Paralisação</h3>
            <div className="space-y-3">
              {Object.entries(currentReport.paralisacoesDetalhe).map(([catKey, rowVal]) => {
                const row = rowVal as StoppageDetailRow;
                const isChecked = row.ativo;
                return (
                  <div key={catKey} className="bg-white p-3.5 rounded border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          id={`chk-${catKey}`}
                          onChange={(e) => handleUpdateStoppage(catKey as any, { ativo: e.target.checked })}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                        />
                        <label htmlFor={`chk-${catKey}`} className="font-bold text-xs uppercase text-slate-750 cursor-pointer select-none">
                          Paralisação por: <span className="text-amber-700 capitalize font-extrabold">{catKey === "raios" ? "Incidência de raios" : catKey}</span>
                        </label>
                      </div>

                      {isChecked && (
                        <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded border border-red-100 font-mono">
                          Total: {row.total || "0h"}
                        </span>
                      )}
                    </div>

                    {isChecked && (
                      <div className="space-y-3 pt-2.5 border-t border-slate-100 animate-slide-down">
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Tocar no horário para marcar inoperância:</span>
                          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                            {HOURS_LIST.map((hour) => {
                              const isSlotSelected = row.horas.includes(hour);
                              return (
                                <button
                                  key={hour}
                                  onClick={() => toggleHourStoppage(catKey as any, hour)}
                                  className={`h-7 px-1 rounded text-[10px] font-bold transition-all select-none border font-mono cursor-pointer ${
                                    isSlotSelected
                                      ? "bg-red-500 border-red-600 text-white"
                                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-500"
                                  }`}
                                >
                                  {hour}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Frentes Paralisadas</label>
                            <input
                              type="text"
                              value={row.frentes}
                              onChange={(e) => handleUpdateStoppage(catKey as any, { frentes: e.target.value })}
                              className="mt-1 block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/20"
                              placeholder="Frente de trabalho 1"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Efetivo de Obra Paralisado</label>
                            <input
                              type="text"
                              value={row.maoDeObraParalisada}
                              onChange={(e) => handleUpdateStoppage(catKey as any, { maoDeObraParalisada: e.target.value })}
                              className="mt-1 block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/20"
                              placeholder="Carpinteiros, Ajudantes..."
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Notas Explicativas / Observações</label>
                            <input
                              type="text"
                              value={row.comentarios}
                              onChange={(e) => handleUpdateStoppage(catKey as any, { comentarios: e.target.value })}
                              className="mt-1 block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/20"
                              placeholder="Inoperância temporária..."
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 pt-2">Índices de Pluviometria & Precipitação (mm)</h3>
            <div className="bg-white p-3.5 rounded border border-slate-200 shadow-xs space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Inserir milímetros de chuva por hora do dia:</span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {HOURS_LIST.map((hour) => {
                    const mmVal = currentReport.chuvaMmPorHora[hour] || 0;
                    return (
                      <div key={hour} className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded p-1 focus-within:border-amber-400">
                        <span className="text-[9px] text-slate-500 font-mono font-bold leading-none">{hour}</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={mmVal || ""}
                          onChange={(e) => handleRainMmChange(hour, Number(e.target.value))}
                          className="mt-1 block w-14 h-7 text-center font-mono text-xs rounded border-slate-300 p-0 text-slate-800 focus:border-amber-500 focus:ring-0"
                          placeholder="-"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Precipitação Acumulada no Mês Anterior (mm)</label>
                  <input
                    type="number"
                    value={currentReport.precipitacao.acumuladoMesAnterior}
                    onChange={(e) => updateReport({ 
                      precipitacao: { ...currentReport.precipitacao, acumuladoMesAnterior: Number(e.target.value) } 
                    })}
                    className="mt-1 block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono bg-slate-50/20"
                    placeholder="55.8"
                  />
                </div>

                <div className="bg-amber-50/40 p-2 text-amber-900 border border-amber-200 rounded flex items-center justify-between col-span-2">
                  <div className="text-xs">
                    <p className="font-bold uppercase text-[10px] text-amber-800 tracking-wider">Acumulado do Diário Deste Dia:</p>
                    <p className="text-[10px] text-amber-600/90 font-medium">Soma automática e consolidada de todas as medições de chuva acima.</p>
                  </div>
                  <div className="text-right bg-amber-500/10 border border-amber-200 font-bold font-mono text-base text-amber-700 rounded px-4 py-1">
                    {currentReport.precipitacao.total} mm
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================== TAB: EFETIVO ================== */}
        {activeTab === "efetivo" && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5">Quadro de Efetivo de Obra</h3>
            
            <div className="space-y-4">
              {currentReport.efetivoDetalhado.map((group, gIdx) => (
                <div key={group.id} className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
                  <div className="bg-slate-900 px-3.5 py-2 flex justify-between items-center text-white">
                    <input
                      type="text"
                      value={group.nome}
                      onChange={(e) => {
                        const updated = [...currentReport.efetivoDetalhado];
                        updated[gIdx] = { ...updated[gIdx], nome: e.target.value };
                        updateReport({ efetivoDetalhado: updated });
                      }}
                      className="bg-transparent border-none text-xs font-bold w-2/3 text-white focus:ring-0 p-0 hover:bg-slate-800/10 transition-colors"
                    />
                    <button
                      onClick={() => handleAddLaborRow(gIdx)}
                      className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[9px] uppercase tracking-wider px-2 py-1 border-none cursor-pointer duration-150 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar Função
                    </button>
                  </div>

                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                        <th className="p-2">Cargo / Função</th>
                        <th className="p-2 w-24 text-center">Tipo</th>
                        <th className="p-2 w-20 text-center">C (Cadastrado)</th>
                        <th className="p-2 w-20 text-center">F (Faltou)</th>
                        <th className="p-2 w-20 text-center">A (Atestado)</th>
                        <th className="p-2 w-24 text-center bg-slate-100">T (Presentes)</th>
                        <th className="p-2 w-14"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {group.items.map((item, iIdx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.cargo}
                              onChange={(e) => handleUpdateLaborItem(gIdx, iIdx, { cargo: e.target.value })}
                              className="h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10 hover:bg-slate-50/50 transition-colors"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <select
                              value={item.moiMod}
                              onChange={(e) => handleUpdateLaborItem(gIdx, iIdx, { moiMod: e.target.value })}
                              className="h-8 rounded border-slate-300 text-xs text-slate-850 py-0.5 w-full focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10 cursor-pointer"
                            >
                              <option value="MOD">Direct (MOD)</option>
                              <option value="MOI">Indirect (MOI)</option>
                            </select>
                          </td>
                          <td className="p-1.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.c}
                              onChange={(e) => handleUpdateLaborItem(gIdx, iIdx, { c: Number(e.target.value) })}
                              className="h-8 w-16 text-center font-mono rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.f}
                              onChange={(e) => handleUpdateLaborItem(gIdx, iIdx, { f: Number(e.target.value) })}
                              className="h-8 w-16 text-center font-mono rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.a}
                              onChange={(e) => handleUpdateLaborItem(gIdx, iIdx, { a: Number(e.target.value) })}
                              className="h-8 w-16 text-center font-mono rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10"
                            />
                          </td>
                          <td className="p-1.5 text-center font-bold font-mono text-slate-800 bg-slate-100">
                            {item.t}
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              onClick={() => handleDeleteLaborRow(gIdx, iIdx)}
                              className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 hover:bg-red-100 transition-colors rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="bg-amber-500/10 border border-amber-200/50 p-3 rounded text-[11px] text-amber-900 leading-normal font-semibold">
              <strong>Procedimento de consolidamento automático:</strong> O sistema realizará a soma matemática dos trabalhadores ativos (C - F) no quadro detalhado para preencher a seção resumitiva dos diários de obras ao salvar!
            </div>
          </div>
        )}

        {/* ================== TAB: EQUIPAMENTOS ================== */}
        {activeTab === "equipamentos" && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5">Equipamentos Mobilizados Detalhes</h3>
            
            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
              <div className="bg-slate-900 px-3.5 py-2 flex justify-between items-center text-white">
                <span className="text-xs font-bold uppercase tracking-wide">Maquinário no Canteiro de Obras</span>
                <button
                  onClick={handleAddEquipmentRow}
                  className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[9px] uppercase tracking-wider px-2 py-1.5 border-none cursor-pointer duration-150 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Mobilizar Equipamento
                </button>
              </div>

              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                    <th className="p-2">Descrição do Equipamento</th>
                    <th className="p-2 w-1/3">Empresa Responsável / Propriedade</th>
                    <th className="p-2 w-28 text-center">Quantidade</th>
                    <th className="p-2 w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white">
                  {currentReport.equipamentosDetalhado && currentReport.equipamentosDetalhado.length > 0 ? (
                    currentReport.equipamentosDetalhado.map((eq, idx) => (
                      <tr key={eq.id || idx}>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={eq.descricao}
                            onChange={(e) => handleUpdateEquipmentRow(idx, { descricao: e.target.value })}
                            className="h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10 hover:bg-slate-50/50 transition-colors"
                            placeholder="Caminhão Basculante"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={eq.empresa}
                            onChange={(e) => handleUpdateEquipmentRow(idx, { empresa: e.target.value })}
                            className="h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10 hover:bg-slate-50/50 transition-colors"
                            placeholder="SEEL"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <input
                            type="number"
                            min="0"
                            value={eq.quantidade}
                            onChange={(e) => handleUpdateEquipmentRow(idx, { quantidade: Number(e.target.value) })}
                            className="h-8 w-20 text-center font-mono rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            onClick={() => handleDeleteEquipmentRow(idx)}
                            className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 hover:bg-red-100 transition-colors rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400 italic bg-slate-50/10">Sem maquinários registrados no momento.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 pt-2">Comentários Adicionais de Fiscalização</h3>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Anotações da Gerenciadora / Contratante (Um completo por linha)</label>
              <textarea
                value={currentReport.comentariosGerenciadoraContratante.join("\n")}
                onChange={(e) => updateReport({ 
                  comentariosGerenciadoraContratante: e.target.value.split("\n").filter(line => line.trim() !== "") 
                })}
                rows={2}
                className="block w-full rounded border-slate-300 shadow-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-slate-800 bg-slate-50/20"
                placeholder="Ex: 001 - Reparos hidráulicos necessários..."
              />
            </div>

            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 pt-2">Firmas e Signatários Responsáveis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 bg-white rounded border border-slate-200 space-y-3 shadow-xs">
                <span className="font-bold text-xs uppercase tracking-wide text-amber-700 block border-b border-slate-150 pb-1">Emitente Emissor (João Medeiros)</span>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Nome do Engenheiro</label>
                  <input
                    type="text"
                    value={currentReport.emitenteNome}
                    onChange={(e) => updateReport({ emitenteNome: e.target.value })}
                    className="mt-0.5 block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Linha de Consolidação de Assinatura</label>
                  <input
                    type="text"
                    value={currentReport.emitenteConsolidado}
                    onChange={(e) => updateReport({ emitenteConsolidado: e.target.value })}
                    className="mt-0.5 block h-8 w-full rounded border-slate-300 text-xs text-slate-600 bg-slate-100/50 font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="Consolidado em ... por ..."
                  />
                </div>
              </div>

              <div className="p-3.5 bg-white rounded border border-slate-200 space-y-3 shadow-xs">
                <span className="font-bold text-xs uppercase tracking-wide text-amber-700 block border-b border-slate-150 pb-1">Fiscal Contratante (José Torres)</span>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Nome do Aprovador</label>
                  <input
                    type="text"
                    value={currentReport.contratanteNome}
                    onChange={(e) => updateReport({ contratanteNome: e.target.value })}
                    className="mt-0.5 block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Linha de Aprovação</label>
                  <input
                    type="text"
                    value={currentReport.contratanteAprovado}
                    onChange={(e) => updateReport({ contratanteAprovado: e.target.value })}
                    className="mt-0.5 block h-8 w-full rounded border-slate-300 text-xs text-slate-600 bg-slate-100/50 font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="Aprovado em ... por ..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// Simple date text formater wrapper
const formatPrintDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  const dateObj = new Date(dateStr + "T12:00:00");
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric", weekday: "short" };
  return dateObj.toLocaleDateString("pt-BR", options);
};
