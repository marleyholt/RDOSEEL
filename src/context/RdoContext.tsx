/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  RdoReport, 
  CompanyLaborGroup, 
  EquipmentMobilizedDetail, 
  Activity, 
  StoppagesDetail 
} from "../types";
import { 
  isFirebaseConfigured, 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType,
  DEFAULT_REPORTS 
} from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from "firebase/firestore";

interface RdoContextType {
  user: User | { uid: string; email: string } | null;
  isLoading: boolean;
  isFirebase: boolean;
  reports: RdoReport[];
  currentReport: RdoReport | null;
  setCurrentReport: (rdo: RdoReport | null) => void;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  saveReport: (report: RdoReport) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  createNewReport: () => RdoReport;
  loadReportToEdit: (id: string) => void;
}

const RdoContext = createContext<RdoContextType | undefined>(undefined);

const LOCAL_REPORTS_KEY = "rdo_reports_local";
const LOCAL_USER_KEY = "rdo_user_local";

export const RdoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | { uid: string; email: string } | null>(null);
  const [reports, setReports] = useState<RdoReport[]>([]);
  const [currentReport, setCurrentReport] = useState<RdoReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auth State
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      });
      return unsubscribe;
    } else {
      // Local Mode Auth Check
      const storedUser = localStorage.getItem(LOCAL_USER_KEY);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      }
      setIsLoading(false);
    }
  }, []);

  // Fetch Reports when User changes
  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setReports([]);
      setCurrentReport(null);
      return;
    }

    if (isFirebaseConfigured && db) {
      const fetchFirebaseReports = async () => {
        setIsLoading(true);
        const path = "rdos";
        try {
          const q = query(
            collection(db, path),
            where("userId", "==", user.uid),
            orderBy("data", "desc")
          );
          const snapshot = await getDocs(q);
          const loaded: RdoReport[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push({ id: docSnap.id, ...docSnap.data() } as RdoReport);
          });
          setReports(loaded);
          if (loaded.length > 0) {
            setCurrentReport(loaded[0]);
          }
        } catch (error) {
          console.error("Firebase fetch failed, falling back to local:", error);
          // Fallback parsing local storage
          loadLocalReports();
        } finally {
          setIsLoading(false);
        }
      };
      fetchFirebaseReports();
    } else {
      loadLocalReports();
    }
  }, [user, isLoading]);

  const loadLocalReports = () => {
    const raw = localStorage.getItem(LOCAL_REPORTS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as RdoReport[];
        setReports(parsed);
        if (parsed.length > 0) {
          setCurrentReport(parsed[0]);
        }
      } catch {
        setReports(DEFAULT_REPORTS);
        setCurrentReport(DEFAULT_REPORTS[0]);
      }
    } else {
      // Initialize with sample reports
      localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(DEFAULT_REPORTS));
      setReports(DEFAULT_REPORTS);
      setCurrentReport(DEFAULT_REPORTS[0]);
    }
  };

  // Auth Operations
  const login = async (email: string, pass: string) => {
    if (isFirebaseConfigured && auth) {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      // Local Mock Login
      const mockUser = { uid: "demo-user", email };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
    }
  };

  const signup = async (email: string, pass: string) => {
    if (isFirebaseConfigured && auth) {
      await createUserWithEmailAndPassword(auth, email, pass);
    } else {
      // Local Mock Signup
      const mockUser = { uid: "demo-user", email };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
      setUser(null);
    }
  };

  // Save Report
  const saveReport = async (report: RdoReport) => {
    if (!user) throw new Error("Usuário não autenticado");

    const reportToSave: RdoReport = {
      ...report,
      userId: user.uid,
      updatedAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      const path = "rdos";
      try {
        if (reportToSave.id) {
          const docRef = doc(db, path, reportToSave.id);
          await setDoc(docRef, reportToSave);
          setReports(prev => 
            prev.map(r => r.id === reportToSave.id ? reportToSave : r)
          );
        } else {
          const collRef = collection(db, path);
          const docRef = await addDoc(collRef, reportToSave);
          reportToSave.id = docRef.id;
          setReports(prev => [reportToSave, ...prev]);
        }
        setCurrentReport(reportToSave);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      // Local Save
      let updatedReports: RdoReport[] = [];
      if (reportToSave.id) {
        updatedReports = reports.map(r => r.id === reportToSave.id ? reportToSave : r);
      } else {
        reportToSave.id = "rdo-" + Math.random().toString(36).substr(2, 9);
        reportToSave.createdAt = new Date().toISOString();
        updatedReports = [reportToSave, ...reports];
      }
      
      localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(updatedReports));
      setReports(updatedReports);
      setCurrentReport(reportToSave);
    }
  };

  // Delete Report
  const deleteReport = async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado");

    if (isFirebaseConfigured && db) {
      const path = `rdos/${id}`;
      try {
        await deleteDoc(doc(db, "rdos", id));
        setReports(prev => prev.filter(r => r.id !== id));
        if (currentReport?.id === id) {
          const remaining = reports.filter(r => r.id !== id);
          setCurrentReport(remaining.length > 0 ? remaining[0] : null);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      // Local Delete
      const updatedReports = reports.filter(r => r.id !== id);
      localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(updatedReports));
      setReports(updatedReports);
      if (currentReport?.id === id) {
        setCurrentReport(updatedReports.length > 0 ? updatedReports[0] : null);
      }
    }
  };

  // Create template report helper
  const createNewReport = (): RdoReport => {
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Default detailed labor structure helper
    const defaultLabor: CompanyLaborGroup[] = [
      {
        id: "group-1",
        nome: "S SEEL - Engenharia",
        items: [
          { id: "itm-1", cargo: "Armador", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" },
          { id: "itm-2", cargo: "Carpinteiro", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" },
          { id: "itm-3", cargo: "Mestre de obras", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" },
          { id: "itm-4", cargo: "Encarregado", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" },
          { id: "itm-5", cargo: "Servente", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" },
          { id: "itm-6", cargo: "Engenheiro de Obra", c: 0, f: 0, a: 0, t: 0, moiMod: "MOI" }
        ]
      },
      {
        id: "group-2",
        nome: "Irmãos Freitas (Subcontratado)",
        items: [
          { id: "itm-7", cargo: "Motorista", c: 0, f: 0, a: 0, t: 0, moiMod: "MOI" },
          { id: "itm-8", cargo: "Vigia", c: 0, f: 0, a: 0, t: 0, moiMod: "MOI" }
        ]
      }
    ];

    const defaultStoppages: StoppagesDetail = {
      chuva: {
        ativo: false,
        horas: [],
        frentes: "Todas as frentes",
        local: "Geral",
        maoDeObraParalisada: "Todas as equipes",
        comentarios: "",
        total: "0h"
      },
      raios: {
        ativo: false,
        horas: [],
        frentes: "Todas as frentes",
        local: "",
        maoDeObraParalisada: "",
        comentarios: "",
        total: "0h"
      },
      projetos: {
        ativo: false,
        horas: [],
        frentes: "",
        local: "",
        maoDeObraParalisada: "",
        comentarios: "",
        total: "0h"
      },
      vizinhos: {
        ativo: false,
        horas: [],
        frentes: "",
        local: "",
        maoDeObraParalisada: "",
        comentarios: "",
        total: "0h"
      }
    };

    return {
      userId: user?.uid || "demo-user",
      rdoNo: `RDO-${todayStr.replace(/-/g, "")}`,
      data: todayStr,
      obra: "SANEAMENTO LESTE",
      cliente: "SABESP",
      gestor: "João Medeiros",
      gerenciadora: "SEEL",
      prazo: 365,
      prazoIncorrido: 100,
      prazoFaltante: 265,
      inicio: "01/01/2026",
      termino: "31/12/2026",
      acidentes: {
        comAfastamentoDia: 0,
        comAfastamentoAusentesDia: 0,
        comAfastamentoAcumulado: 0,
        semAfastamentoDia: 0,
        semAfastamentoAcumulado: 0
      },
      efetivoSummary: {
        moi: 0,
        mod: 0,
        subcontratadosMoiMod: 0,
        afastados: 0,
        total: 0
      },
      paralisacoesSummary: {
        totalHorasParalisadasDia: 0,
        numeroParalisacoes: 0
      },
      equipamentosSummary: {
        mobilizados: 0,
        subcontratadosMobilizados: 0,
        total: 0
      },
      atividades: [
        {
          id: "act-new-1",
          ref: "001",
          fase: "ATIVIDADES - FASE 01 - REDE EXTERNA",
          identificador: "1.1",
          descricao: "Escavação manual de valas em solo de 1ª categoria",
          intervalo: "E+m",
          total: "0"
        }
      ],
      fatosRelevantes: [],
      paralisacoesDetalhe: defaultStoppages,
      chuvaMmPorHora: {
        "6h": 0, "7h": 0, "8h": 0, "9h": 0, "10h": 0, "11h": 0, "12h": 0, "13h": 0, "14h": 0,
        "15h": 0, "16h": 0, "17h": 0, "18h": 0, "19h": 0, "20h": 0, "21h": 0, "22h": 0, "23h": 0,
        "0h": 0, "1h": 0, "2h": 0, "3h": 0, "4h": 0, "5h": 0
      },
      precipitacao: {
        manha: 0,
        tarde: 0,
        noite: 0,
        total: 0,
        acumuladoMes: 0,
        acumuladoMesAnterior: 0
      },
      efetivoDetalhado: defaultLabor,
      equipamentosDetalhado: [],
      comentariosGerenciadoraContratante: [],
      emitenteNome: "João Medeiros",
      emitenteConsolidado: "",
      emitenteHash: "ff2b2060a7b8e8ae496a9553579effac",
      contratanteNome: "José Torres",
      contratanteAprovado: "",
      contratanteHash: "29381edd9b0233ff2655f9571859320a"
    };
  };

  const loadReportToEdit = (id: string) => {
    const report = reports.find(r => r.id === id);
    if (report) {
      setCurrentReport(report);
    }
  };

  return (
    <RdoContext.Provider value={{
      user,
      isLoading,
      isFirebase: isFirebaseConfigured,
      reports,
      currentReport,
      setCurrentReport,
      login,
      signup,
      logout,
      saveReport,
      deleteReport,
      createNewReport,
      loadReportToEdit
    }}>
      {children}
    </RdoContext.Provider>
  );
};

export const useRdoStore = () => {
  const context = useContext(RdoContext);
  if (context === undefined) {
    throw new Error("useRdoStore must be used within an RdoProvider");
  }
  return context;
};
