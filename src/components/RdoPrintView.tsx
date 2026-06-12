/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { RdoReport, StoppageDetailRow } from "../types";
import { RainChart } from "./RainChart";
import { ArrowLeft, Printer, ShieldCheck } from "lucide-react";

interface RdoPrintViewProps {
  report: RdoReport;
  onClose: () => void;
}

// Helper to format short date like "08/05/2019, Qua"
const formatPrintDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  const dateObj = new Date(dateStr + "T12:00:00");
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
  const formattedDate = dateObj.toLocaleDateString("pt-BR", options);
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const weekDay = weekDays[dateObj.getDay()];
  return `${formattedDate}, ${weekDay}`;
};

// Barcode svg simulator
const BarcodeSvg: React.FC<{ code: string }> = ({ code }) => {
  // Generate pseudo-random line widths
  const lines = [];
  let seed = 0;
  for (let i = 0; i < code.length; i++) {
    seed += code.charCodeAt(i);
  }
  for (let i = 0; i < 40; i++) {
    const w = ((seed + i) % 3) + 1;
    const spacing = ((seed * i) % 2) + 1;
    lines.push(<line key={i} x1={i * 4} y1="0" x2={i * 4} y2="30" stroke="black" strokeWidth={w} />);
  }
  return (
    <div className="flex flex-col items-center justify-center mt-1">
      <svg width="160" height="25" className="opacity-85">
        {lines}
      </svg>
      <span className="font-mono text-[7px] text-gray-500 mt-1 uppercase tracking-widest">{code}</span>
    </div>
  );
};

// QR Code SVG simulator
const QrCodeSvg: React.FC<{ value: string }> = ({ value }) => {
  return (
    <svg width="40" height="40" viewBox="0 0 10 10" className="opacity-90">
      <rect width="10" height="10" fill="white" />
      {/* Draw square mock grids */}
      <rect x="0" y="0" width="3" height="3" fill="black" />
      <rect x="1" y="1" width="1" height="1" fill="white" />
      <rect x="7" y="0" width="3" height="3" fill="black" />
      <rect x="8" y="1" width="1" height="1" fill="white" />
      <rect x="0" y="7" width="3" height="3" fill="black" />
      <rect x="1" y="7" width="1" height="1" fill="white" />
      {/* Random internal dots */}
      <rect x="4" y="1" width="1" height="1" fill="black" />
      <rect x="5" y="2" width="1" height="1" fill="black" />
      <rect x="4" y="4" width="2" height="2" fill="black" />
      <rect x="8" y="5" width="1" height="1" fill="black" />
      <rect x="7" y="8" width="1" height="1" fill="black" />
      <rect x="9" y="8" width="1" height="1" fill="black" />
    </svg>
  );
};

export const RdoPrintView: React.FC<RdoPrintViewProps> = ({ report, onClose }) => {
  const triggerPrint = () => {
    window.print();
  };

  const hoursList = [
    "6h", "7h", "8h", "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h", "18h", "19h", "20h", "21h", "22h", "23h",
    "0h", "1h", "2h", "3h", "4h", "5h"
  ];

  // Helper component to render signatures footer
  const PrintFooter: React.FC<{ pageNum: number }> = ({ pageNum }) => (
    <div className="border-t border-gray-300 grid grid-cols-4 gap-2 text-center text-[10px] mt-auto pt-2 print-footer bg-white">
      <div className="border-r border-gray-200 pr-2 flex flex-col justify-end align-middle h-24 pb-1">
        <span className="font-bold border-b border-gray-100 pb-1 text-gray-700 uppercase">EMITENTE</span>
        <div className="flex flex-col items-center">
          <div className="w-4/5 border-b border-gray-300 mt-8 mb-1"></div>
          <span className="font-semibold block truncate max-w-full text-gray-800">{report.emitenteNome || "Representante Emissor"}</span>
          <span className="text-[7px] text-gray-400 block font-mono">SEEL ENGENHARIA</span>
        </div>
      </div>
      
      <div className="border-r border-gray-200 pr-2 flex flex-col justify-end align-middle h-24 pb-1">
        <span className="font-bold border-b border-gray-100 pb-1 text-gray-700 uppercase">GERENCIADORA</span>
        <div className="flex flex-col items-center">
          <div className="w-4/5 border-b border-gray-300 mt-8 mb-1"></div>
          <span className="font-semibold block truncate max-w-full text-gray-800">-</span>
          <span className="text-[7px] text-gray-400 block font-mono">{report.gerenciadora || "FISCALIZAÇÃO"}</span>
        </div>
      </div>

      <div className="border-r border-gray-200 pr-2 flex flex-col justify-end align-middle h-24 pb-1">
        <span className="font-bold border-b border-gray-100 pb-1 text-gray-700 uppercase">CONTRATANTE</span>
        <div className="flex flex-col items-center">
          <div className="w-4/5 border-b border-gray-300 mt-8 mb-1"></div>
          <span className="font-semibold block truncate max-w-full text-gray-800">{report.contratanteNome || "Fiscal Contratante"}</span>
          <span className="text-[7px] text-gray-400 block font-mono">{report.cliente || "CLIENTE"}</span>
        </div>
      </div>

      <div className="flex flex-col justify-between align-middle items-center h-24 text-[9px]">
        <span className="font-bold text-gray-700 text-center uppercase tracking-wide">Paginação</span>
        <div className="text-center font-sans">
          <p className="font-bold text-gray-800">Pág.{pageNum}</p>
          <p className="text-gray-400">de 3</p>
        </div>
        <QrCodeSvg value={`RDO-${report.rdoNo}-PAGE-${pageNum}`} />
      </div>
    </div>
  );

  // Common Headings inside A4 sheet
  const PrintHeader = () => (
    <div className="flex justify-between items-stretch border border-gray-300 pb-0 bg-white">
      {/* Sabesp + Seel Vector representation */}
      <div className="w-1/4 min-w-[120px] p-2 flex flex-col justify-center items-center border-r border-gray-300 gap-1">
        {/* Mocking SABESP logo path */}
        <div className="flex items-center gap-1">
          <div className="bg-[#00adef] text-white font-black text-[10px] px-1 rounded-sm tracking-tighter flex items-center h-5">
            SABESP
          </div>
          <div className="bg-[#004899] text-white font-extrabold text-[10px] px-1 rounded-sm leading-tight flex items-center h-5 border border-[#3b82f6]">
            SEEL
          </div>
        </div>
        <span className="text-[7px] text-center font-semibold text-gray-400 block tracking-tight">SERVIÇOS DE ENGENHARIA</span>
      </div>

      <div className="flex-1 px-4 py-2 flex flex-col justify-center items-center border-r border-gray-300 text-center">
        <h1 className="text-lg font-bold tracking-tight text-gray-800 font-sans uppercase">Relatório Diário de Obras</h1>
        <p className="text-[8px] text-gray-400 font-sans tracking-widest mt-0.5">FORMULÁRIO DIÁRIO INTEGRADO - VERSÃO WEB</p>
      </div>

      <div className="w-1/4 p-2 flex flex-col justify-center bg-[#004899] text-white text-center leading-none">
        <span className="text-[9px] uppercase tracking-wider text-blue-200">RDO Nº</span>
        <span className="text-sm font-bold block mt-1 tracking-wider">{report.rdoNo}</span>
      </div>
    </div>
  );

  // Key-Value Grid Block
  const ReportInfoBlock = () => (
    <div className="mt-2 border border-gray-300 text-[9px] grid grid-cols-12 gap-0 divide-x divide-y divide-gray-300 bg-white">
      <div className="col-span-12 md:col-span-8 p-1.5 flex items-center">
        <span className="font-bold text-gray-500 uppercase mr-1">OBRA:</span>
        <span className="font-bold text-[#004899] text-xs">{report.obra}</span>
      </div>
      <div className="col-span-12 md:col-span-4 p-1.5 flex items-center">
        <span className="font-bold text-gray-500 uppercase mr-1">DATA:</span>
        <span className="font-bold text-gray-800">{formatPrintDate(report.data)}</span>
      </div>

      <div className="col-span-4 p-1.5 flex items-center">
        <span className="font-bold text-gray-500 uppercase mr-1">CLIENTE:</span>
        <span className="font-semibold text-gray-800">{report.cliente}</span>
      </div>
      <div className="col-span-4 p-1.5 flex items-center">
        <span className="font-bold text-gray-500 uppercase mr-1">CONTRATADA:</span>
        <span className="font-bold text-gray-800">{report.contratada || "SEEL ENGENHARIA"}</span>
      </div>
      <div className="col-span-4 p-1.5 flex items-center">
        <span className="font-bold text-gray-500 uppercase mr-1">GESTOR:</span>
        <span className="font-semibold text-gray-800">{report.gestor}</span>
      </div>

      {/* Deadlines Block */}
      <div className="col-span-4 p-1 flex flex-col">
        <span className="text-[7px] text-gray-400 block leading-tight">PRAZO CONTRATUAL</span>
        <span className="font-bold text-gray-800">{report.prazo} dias</span>
      </div>
      <div className="col-span-4 p-1 flex flex-col">
        <span className="text-[7px] text-gray-400 block leading-tight">PRAZO INCORRIDO</span>
        <span className="font-bold text-gray-800">{report.prazoIncorrido} dias</span>
      </div>
      <div className="col-span-4 p-1 flex flex-col">
        <span className="text-[7px] text-gray-400 block leading-tight">PRAZO REMANESCENTE</span>
        <span className="font-bold text-gray-800">{report.prazoFaltante} dias</span>
      </div>

      <div className="col-span-4 p-1 flex flex-col">
        <span className="text-[7px] text-gray-400 block leading-tight">INÍCIO DA OBRA</span>
        <span className="font-bold text-gray-800">{report.inicio || "-"}</span>
      </div>
      <div className="col-span-4 p-1 flex flex-col">
        <span className="text-[7px] text-gray-400 block leading-tight">TÉRMINO DA OBRA</span>
        <span className="font-bold text-gray-800">{report.termino || "-"}</span>
      </div>
      <div className="col-span-4 p-1 flex flex-col">
        <span className="text-[7px] text-gray-400 block leading-tight">GERENCIADORA</span>
        <span className="font-bold text-gray-800">{report.gerenciadora || "-"}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto flex flex-col p-4 md:p-6 print-container">
      {/* Action panel at top (hidden during printing) */}
      <div className="bg-white max-w-5xl w-full mx-auto p-4 rounded-t-xl border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center shadow-md no-print">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-xs text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Editor
        </button>
        <div className="flex gap-2">
          <div className="bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg flex items-center gap-1.5 text-xs text-blue-700">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <span>Assinado Eletronicamente</span>
          </div>
          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#004899] hover:bg-blue-800 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimir RDO (Exportar PDF)
          </button>
        </div>
      </div>

      {/* Pages Container */}
      <div className="max-w-5xl w-full mx-auto bg-slate-100 p-0 md:p-4 rounded-b-xl flex flex-col gap-6 scroll-smooth print:gap-0 print:p-0 print:bg-white">
        
        {/* ================= PAGE 1 ================= */}
        <div className="bg-white border md:border-gray-300 p-4 md:p-8 flex flex-col w-full min-h-[1120px] print-page relative break-after-page shadow-sm print:shadow-none print:border-none">
          <PrintHeader />
          <ReportInfoBlock />

          {/* ACIDENTES vs EFETIVO SUMMARY */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {/* Acidentes Summary Table */}
            <div className="border border-gray-300">
              <div className="bg-[#004899]/5 font-bold text-[8px] text-[#004899] px-2 py-0.5 border-b border-gray-300 flex justify-between">
                <span>ACIDENTES</span>
                <span className="text-gray-400">(resumo)</span>
              </div>
              <div className="text-[8px] divide-y divide-gray-200">
                <div className="flex justify-between p-1">
                  <span>Acidentes com afastamento no dia</span>
                  <span className="font-bold font-mono">{report.acidentes.comAfastamentoDia}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Acidentes com afastamento - ausentes no dia</span>
                  <span className="font-bold font-mono">{report.acidentes.comAfastamentoAusentesDia}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Acidentes com afastamento - acumulado obra</span>
                  <span className="font-bold font-mono">{report.acidentes.comAfastamentoAcumulado}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Acidentes sem afastamento no dia</span>
                  <span className="font-bold font-mono">{report.acidentes.semAfastamentoDia}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Acidentes sem afastamento - acumulado obra</span>
                  <span className="font-bold font-mono">{report.acidentes.semAfastamentoAcumulado}</span>
                </div>
              </div>
            </div>

            {/* Efetivo Summary Table */}
            <div className="border border-gray-300">
              <div className="bg-[#004899]/5 font-bold text-[8px] text-[#004899] px-2 py-0.5 border-b border-gray-300 flex justify-between">
                <span>EFETIVO</span>
                <span className="text-gray-400">(resumo)</span>
              </div>
              <div className="text-[8px] divide-y divide-gray-200">
                <div className="flex justify-between p-1">
                  <span>Mão de Obra Indireta (MOI)</span>
                  <span className="font-bold font-mono">{report.efetivoSummary.moi}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Mão de Obra Direta (MOD)</span>
                  <span className="font-bold font-mono">{report.efetivoSummary.mod}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Subcontratados - MOI / MOD</span>
                  <span className="font-bold font-mono">{report.efetivoSummary.subcontratadosMoiMod}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Afastados / Outros</span>
                  <span className="font-bold font-mono">{report.efetivoSummary.afastados}</span>
                </div>
                <div className="flex justify-between p-1 bg-gray-50 font-bold border-t border-gray-300 leading-none py-1.5">
                  <span className="text-[#004899]">EFETIVO TOTAL</span>
                  <span className="font-mono text-[#004899]">{report.efetivoSummary.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* PARALISAÇÕES vs EQUIPAMENTOS SUMMARY */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {/* Paralisações Table */}
            <div className="border border-gray-300">
              <div className="bg-[#004899]/5 font-bold text-[8px] text-[#004899] px-2 py-0.5 border-b border-gray-300 flex justify-between">
                <span>PARALISAÇÕES</span>
                <span className="text-gray-400">(resumo)</span>
              </div>
              <div className="text-[8px] divide-y divide-gray-200">
                <div className="flex justify-between p-1">
                  <span>Acumulado de horas paralisadas no dia</span>
                  <span className="font-bold font-mono">{report.paralisacoesSummary.totalHorasParalisadasDia}h</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Número total de paralisações</span>
                  <span className="font-bold font-mono">{report.paralisacoesSummary.numeroParalisacoes}</span>
                </div>
              </div>
            </div>

            {/* Equipamentos Summary Table */}
            <div className="border border-gray-300">
              <div className="bg-[#004899]/5 font-bold text-[8px] text-[#004899] px-2 py-0.5 border-b border-gray-300 flex justify-between">
                <span>EQUIPAMENTOS</span>
                <span className="text-gray-400">(resumo)</span>
              </div>
              <div className="text-[8px] divide-y divide-gray-200">
                <div className="flex justify-between p-1">
                  <span>Equipamentos Próprios Mobilizados</span>
                  <span className="font-bold font-mono">{report.equipamentosSummary.mobilizados}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Equipamentos Subcontratados</span>
                  <span className="font-bold font-mono">{report.equipamentosSummary.subcontratadosMobilizados}</span>
                </div>
                <div className="flex justify-between p-1 bg-gray-50 font-bold border-t border-gray-300 leading-none py-1.5">
                  <span className="text-[#004899]">EQUIPAMENTOS TOTAL</span>
                  <span className="font-mono text-[#004899]">{report.equipamentosSummary.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE ACTIVITIES (First Block) */}
          <div className="mt-3 flex-1 flex flex-col">
            <h3 className="text-[9px] font-bold bg-[#004899] text-white py-1 px-2 uppercase tracking-wide">
              ATIVIDADES EXECUTADAS NO PERÍODO — FASES DE CAMPO
            </h3>

            {report.atividades && report.atividades.length > 0 ? (
              <div className="border border-gray-300 border-t-0 text-[8.5px]">
                {/* We chunk or list the activities. On page 1 we print up to 4-5 activities, especially if they have images, avoiding page breaking */}
                {report.atividades.slice(0, 5).map((act, idx) => (
                  <div key={act.id || idx} className="border-b border-gray-200 p-2 last:border-b-0">
                    <div className="flex items-start text-gray-400 text-[7.5px] uppercase font-bold tracking-tight mb-1">
                      <span className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded-sm mr-2">{act.ref}</span>
                      <span>{act.fase}</span>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-20 font-mono text-gray-500 text-[8px] shrink-0">
                        ID: {act.identificador}
                      </div>
                      <div className="flex-1 text-gray-800">
                        {act.descricao}
                      </div>
                      <div className="w-24 text-right pr-2">
                        <span className="text-gray-400">Total: </span>
                        <span className="font-mono font-bold text-gray-800">{act.total} {act.intervalo}</span>
                      </div>
                    </div>

                    {act.comentario && (
                      <p className="mt-1.5 ml-2 text-[8px] italic text-[#004899] bg-[#004899]/5 px-2 py-0.5 rounded-sm">
                        COMENTÁRIO: {act.comentario}
                      </p>
                    )}

                    {/* Rendering images if applicable */}
                    {act.imagens && act.imagens.length > 0 && (
                      <div className="flex gap-2.5 mt-2.5 ml-2">
                        {act.imagens.slice(0, 2).map((imgUrl, imgIdx) => (
                          <div key={imgIdx} className="w-1/2 max-w-[240px] aspect-[4/3] rounded border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                            <img
                              src={imgUrl}
                              alt={`Imagem anexa ${imgIdx + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {report.atividades.length > 5 && (
                  <p className="text-[7.5px] italic text-gray-400 p-1.5 text-center border-t border-gray-100 bg-gray-50">
                    As demais atividades continuam na página 2 de planejamento.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex-1 border border-gray-300 border-t-0 flex items-center justify-center text-gray-400 text-[9px] italic py-8">
                Nenhuma atividade cadastrada para este RDO.
              </div>
            )}
          </div>

          <PrintFooter pageNum={1} />
        </div>

        {/* ================= PAGE 2 ================= */}
        <div className="bg-white border md:border-gray-300 p-4 md:p-8 flex flex-col w-full min-h-[1120px] print-page relative break-after-page shadow-sm print:shadow-none print:border-none">
          <PrintHeader />
          
          <div className="mt-2 text-[8.5px] flex flex-col flex-1 gap-2.5">
            {/* CONTINUING ACTIVITIES (If any) */}
            {report.atividades && report.atividades.length > 5 && (
              <div>
                <h4 className="text-[9px] font-bold bg-gray-800 text-white py-0.5 px-2 uppercase tracking-wide">
                  Atividades - Planejamento & Outros (Continuação)
                </h4>
                <div className="border border-gray-300 border-t-0">
                  {report.atividades.slice(5).map((act, idx) => (
                    <div key={act.id || idx} className="border-b border-gray-200 p-1.5 last:border-b-0 flex gap-2">
                      <div className="w-8 text-blue-700 font-bold">{act.ref}</div>
                      <div className="w-24 text-gray-400 font-mono text-[8px]">{act.identificador}</div>
                      <div className="flex-1 text-gray-800">{act.descricao}</div>
                      <div className="w-24 text-right pr-2">
                        <span className="font-mono">{act.total} {act.intervalo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FATOS RELEVANTES - ALTERAÇÃO DE ESCOPO CONTRATADO */}
            <div>
              <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
                FATOS RELEVANTES — OCORRÊNCIAS EXTRAORDINÁRIAS DO DIA
              </h4>
              <div className="border border-gray-300 p-2 min-h-12 bg-white">
                {report.fatosRelevantes && report.fatosRelevantes.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1">
                    {report.fatosRelevantes.map((fato, fIdx) => (
                      <li key={fIdx} className="text-gray-800 text-[8.5px]">{fato}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 italic text-[8px] text-center">Nenhuma ocorrência extraordinária ou alteração de escopo anotada.</p>
                )}
              </div>
            </div>

            {/* PARALISAÇÕES - TIMETABLE GRID */}
            <div>
              <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
                TABELA DETALHADA DE PARALISAÇÕES DO EFETIVO
              </h4>
              <div className="border border-gray-300 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-300 text-[7px] text-gray-500">
                      <th className="p-1 border-r border-gray-200 w-16">CATEGORIA</th>
                      <th className="p-1 border-r border-gray-200">JANELA DE HORAS PARALISADAS (6H ÀS 5H DO DIA SEGUINTE)</th>
                      <th className="p-1 border-r border-gray-200 w-24">FRENTES AFETADAS</th>
                      <th className="p-1 border-r border-gray-200 w-20">EQUIPES AFETADAS</th>
                      <th className="p-1 w-12 text-center">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(report.paralisacoesDetalhe).map(([key, rowVal]) => {
                      const row = rowVal as StoppageDetailRow;
                      return (
                        <tr key={key} className={row.ativo ? "bg-white text-[8px]" : "bg-gray-50/50 text-[8px] opacity-70"}>
                          <td className="p-1 border-r border-gray-300 font-bold capitalize text-blue-900 bg-gray-50/30">
                            {key === "raios" ? "Raios" : key}
                          </td>
                          <td className="p-1 border-r border-gray-300">
                            {/* Render hour tag bullets that are paralisadas */}
                            <div className="flex flex-wrap gap-1">
                              {row.ativo && row.horas.length > 0 ? (
                                row.horas.map(h => (
                                  <span key={h} className="bg-red-50 text-red-700 border border-red-200 rounded px-1 text-[7.5px] font-bold font-mono">
                                    {h}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 text-[7.5px] italic">Sem paralisação</span>
                              )}
                            </div>
                            {row.comentarios && (
                              <p className="text-[7.5px] italic text-[#004899] mt-0.5">Nota: {row.comentarios}</p>
                            )}
                          </td>
                          <td className="p-1 border-r border-gray-300 text-gray-600 truncate max-w-[120px]">
                            {row.ativo ? row.frentes || "Todas" : "-"}
                          </td>
                          <td className="p-1 border-r border-gray-300 text-gray-600 truncate max-w-[100px]">
                            {row.ativo ? row.maoDeObraParalisada || "Toda equipe" : "-"}
                          </td>
                          <td className="p-1 text-center font-bold text-red-600 font-mono">
                            {row.ativo ? row.total || "0h" : "0h"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ACCIDENTS EXTENDED NOTE */}
            <div className="border border-gray-300 p-1 flex justify-between bg-yellow-50/20 text-[7.5px]">
              <span className="font-bold text-gray-600 uppercase">INFORMAÇÕES DE SEGURANÇA (ACIDENTES):</span>
              <span className="font-bold text-emerald-700 italic">
                {report.acidentes.comAfastamentoDia === 0 && report.acidentes.semAfastamentoDia === 0 
                  ? "NENHUMA OCORRÊNCIA DE ACIDENTE JUNTADA NESTE RDO DO DIA." 
                  : "OCORRÊNCIA DE ACIDENTE REGISTRADA NO SISTEMA."}
              </span>
            </div>

            {/* CLIMATIC CONDITIONS & RAINFALL DETAILS */}
            <div>
              <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
                CONDIÇÕES CLIMÁTICAS & ÍNDICE PLUVIOMÉTRICO (CHUVA MM)
              </h4>
              
              {/* Hour by hour rainfall horizontal cells */}
              <div className="border border-gray-300 overflow-x-auto mt-1">
                <table className="w-full text-center border-collapse text-[7.5px]">
                  <thead>
                    <tr className="bg-gray-100 divide-x divide-gray-200 border-b border-gray-300 font-bold text-gray-600">
                      {hoursList.map(h => <th key={h} className="p-0.5 w-6">{h}</th>)}
                      <th className="p-0.5 w-12 bg-blue-50 text-blue-900 border-l border-gray-300">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="divide-x divide-gray-200 font-mono text-gray-700">
                      {hoursList.map(h => {
                        const val = report.chuvaMmPorHora[h] || 0;
                        return (
                          <td key={h} className={val > 0 ? "p-0.5 bg-blue-50 text-blue-800 font-bold" : "p-0.5 text-gray-300"}>
                            {val > 0 ? `${val}` : "-"}
                          </td>
                        );
                      })}
                      <td className="p-1 font-bold text-blue-700 bg-blue-100/50 text-[8px] border-l border-gray-300">
                        {report.precipitacao.total} mm
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Rain summarizes text row */}
              <div className="mt-1 border border-gray-300 p-1.5 grid grid-cols-6 gap-2 text-[8px] text-gray-600 bg-white leading-tight">
                <div>Manhã: <strong className="text-gray-800 font-mono">{report.precipitacao.manha} mm</strong></div>
                <div>Tarde: <strong className="text-gray-800 font-mono">{report.precipitacao.tarde} mm</strong></div>
                <div>Noite: <strong className="text-gray-800 font-mono">{report.precipitacao.noite} mm</strong></div>
                <div>Total Período: <strong className="text-blue-700 font-mono">{report.precipitacao.total} mm</strong></div>
                <div>Acumulado Mês: <strong className="text-gray-800 font-mono">{report.precipitacao.acumuladoMes} mm</strong></div>
                <div>Mês Anterior: <strong className="text-gray-800 font-mono">{report.precipitacao.acumuladoMesAnterior} mm</strong></div>
              </div>

              {/* Vector Rainfall chart placeholder */}
              <div className="mt-2 flex justify-center w-full bg-white border border-gray-200 rounded p-1">
                <div className="w-full">
                  <p className="text-[7.5px] uppercase font-bold text-gray-400 text-center mb-1">CÁLCULO E ANÁLISE DE CHUVA - ÚLTIMAS 24H</p>
                  <RainChart data={report.chuvaMmPorHora} />
                </div>
              </div>
            </div>
          </div>

          <PrintFooter pageNum={2} />
        </div>

        {/* ================= PAGE 3 ================= */}
        <div className="bg-white border md:border-gray-300 p-4 md:p-8 flex flex-col w-full min-h-[1120px] print-page relative shadow-sm print:shadow-none print:border-none">
          <PrintHeader />

          <div className="mt-2 text-[8.5px] flex flex-col flex-1 gap-3.5">
            {/* EFETIVO - QUADRO DETALHADO */}
            <div>
              <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
                EFETIVO - QUADRO DETALHADO DO PESSOAL DE CAMPO
              </h4>
              <p className="text-[6.5px] text-gray-400 italic mb-1 uppercase tracking-tight">Legenda: C - Cadastrados em Folha; F - Faltas no dia; A - Atestados Médicos; T - Total Geral Presente</p>

              <div className="space-y-2 border border-gray-300 p-1 bg-gray-50/50">
                {report.efetivoDetalhado && report.efetivoDetalhado.length > 0 ? (
                  report.efetivoDetalhado.map((group) => {
                    // Calc group totals
                    const totalC = group.items.reduce((sum, item) => sum + (item.c || 0), 0);
                    const totalF = group.items.reduce((sum, item) => sum + (item.f || 0), 0);
                    const totalA = group.items.reduce((sum, item) => sum + (item.a || 0), 0);
                    const totalT = group.items.reduce((sum, item) => sum + (item.t || 0), 0);

                    return (
                      <div key={group.id} className="bg-white border border-gray-200">
                        <div className="bg-[#004899]/10 p-1 flex justify-between font-bold text-xs text-[#004899]">
                          <span>{group.nome}</span>
                          <span className="text-[8px] bg-[#004899] text-white px-1 py-0.5 rounded uppercase">Grupo de Efetivo</span>
                        </div>
                        
                        <table className="w-full text-left font-sans text-[8px] border-collapse">
                          <thead>
                            <tr className="bg-gray-100 border-b border-gray-200 text-gray-500 font-semibold">
                              <th className="p-1 border-r border-gray-200">CARGO / FUNÇÃO</th>
                              <th className="p-1 border-r border-gray-200 w-16 text-center">TIPO</th>
                              <th className="p-1 border-r border-gray-200 w-12 text-center">C</th>
                              <th className="p-1 border-r border-gray-200 w-12 text-center">F</th>
                              <th className="p-1 border-r border-gray-200 w-12 text-center">A</th>
                              <th className="p-1 w-12 text-center bg-gray-50">T</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {group.items.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-1 border-r border-gray-200 font-medium text-gray-800">{item.cargo}</td>
                                <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-500">{item.moiMod}</td>
                                <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-700">{item.c}</td>
                                <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-700">{item.f}</td>
                                <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-700">{item.a}</td>
                                <td className="p-1 text-center font-mono font-bold bg-gray-50 text-gray-800">{item.t}</td>
                              </tr>
                            ))}
                            {/* Company Subtotals */}
                            <tr className="bg-gray-50/70 border-t border-gray-300 font-bold">
                              <td className="p-1 border-r border-gray-200 text-right pr-2 uppercase">TOTAL {group.nome}</td>
                              <td className="p-1 border-r border-gray-200"></td>
                              <td className="p-1 border-r border-gray-200 text-center font-mono">{totalC}</td>
                              <td className="p-1 border-r border-gray-200 text-center font-mono">{totalF}</td>
                              <td className="p-1 border-r border-gray-200 text-center font-mono">{totalA}</td>
                              <td className="p-1 text-center font-mono text-blue-900 bg-blue-50">{totalT}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-400 italic text-[8px] text-center p-3">Nenhum trabalhador detalhado no quadro de efetivo.</p>
                )}
              </div>
            </div>

            {/* EQUIPAMENTOS MOBILIZADOS DETAIL */}
            <div>
              <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
                EQUIPAMENTOS MOBILIZADOS — DETALHAMENTO DE EQUIPAMENTO MECÂNICO
              </h4>
              <div className="border border-gray-300">
                <table className="w-full text-left font-sans text-[8px] border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300 text-gray-500 font-bold uppercase text-[7.5px]">
                      <th className="p-1 px-2 border-r border-gray-200 w-16 text-center">Ref</th>
                      <th className="p-1 border-r border-gray-200">DESCRIÇÃO DO EQUIPAMENTO</th>
                      <th className="p-1 border-r border-gray-200 w-32">EMPRESA RESPONSÁVEL / PROPRIEDADE</th>
                      <th className="p-1 w-24 text-center">QTD MOBILIZADA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {report.equipamentosDetalhado && report.equipamentosDetalhado.length > 0 ? (
                      report.equipamentosDetalhado.map((eq, eIdx) => (
                        <tr key={eq.id || eIdx} className="hover:bg-slate-50">
                          <td className="p-1 text-center border-r border-gray-200 text-gray-400 font-mono">
                            {(eIdx + 1).toString().padStart(2, "0")}
                          </td>
                          <td className="p-1 px-2 border-r border-gray-200 font-medium text-gray-800">{eq.descricao}</td>
                          <td className="p-1 border-r border-gray-200 text-gray-600">{eq.empresa}</td>
                          <td className="p-1 text-center font-bold font-mono text-gray-800">{eq.quantidade}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-gray-400 italic">Nenhum equipamento mecânico cadastrado no dia.</td>
                      </tr>
                    )}
                    {/* Total Row */}
                    <tr className="bg-gray-50 font-bold text-gray-800 border-t border-gray-300">
                      <td className="p-1 border-r border-gray-200"></td>
                      <td className="p-1 px-2 border-r border-gray-200 text-right uppercase text-[7.5px]">TOTAL EQUIPAMENTOS MOBILIZADOS</td>
                      <td className="p-1 border-r border-gray-200"></td>
                      <td className="p-1 text-center font-mono text-blue-900 bg-blue-50/50">
                        {report.equipamentosDetalhado.reduce((sum, eq) => sum + (eq.quantidade || 0), 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* COMENTÁRIO GERENCIADORA / CONTRATANTE */}
            <div>
              <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
                COMENTÁRIO DA FISCALIZAÇÃO / GERENCIADORA / CONTRATANTE
              </h4>
              <div className="border border-gray-300 p-2 min-h-16 bg-white flex flex-col gap-1 text-[8.5px]">
                {report.comentariosGerenciadoraContratante && report.comentariosGerenciadoraContratante.length > 0 ? (
                  report.comentariosGerenciadoraContratante.map((comm, idx) => (
                    <div key={idx} className="flex gap-1 items-start text-gray-700 leading-tight">
                      <span className="text-[#004899] font-bold">{(idx + 1).toString().padStart(3, "0")} -</span>
                      <p className="flex-1 italic">{comm}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 italic text-[8px] text-center my-auto">Nenhum comentário adicionado pela fiscalização contratante.</p>
                )}
              </div>
            </div>
          </div>

          <PrintFooter pageNum={3} />
        </div>

      </div>
    </div>
  );
};
