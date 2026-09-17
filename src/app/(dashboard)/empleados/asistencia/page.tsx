"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { Employee, EmployeeAttendance, AttendanceStatus } from "@/types/database.types";
import { useEffect, useState } from "react";
import { getTodayDateString } from "@/lib/dates";
import { Calendar, Save, Clock, Check, X, Plane, Coffee, Search } from "lucide-react";

export default function AsistenciaPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [currentDate, setCurrentDate] = useState(getTodayDateString());
  const [attendances, setAttendances] = useState<Record<string, EmployeeAttendance>>({});

  const loadData = () => {
    // Only active employees
    const emps = store.getEmployees(search).filter(e => e.active);
    setEmployees(emps);
    
    // Load attendances for the selected date
    const attList = store.getAttendances(currentDate);
    const attMap: Record<string, EmployeeAttendance> = {};
    attList.forEach(a => {
      attMap[a.employee_id] = a;
    });
    setAttendances(attMap);
  };

  useEffect(() => {
    loadData();
  }, [search, currentDate]);

  const handleStatusChange = (employeeId: string, status: AttendanceStatus) => {
    const current = attendances[employeeId] || {
      employee_id: employeeId,
      date: currentDate,
      hours_worked: status === 'presente' ? 8 : 0,
      extra_hours: 0,
    };

    setAttendances(prev => ({
      ...prev,
      [employeeId]: {
        ...current,
        status,
        hours_worked: status === 'presente' ? 8 : 0 // Default to 8 if present, 0 otherwise
      }
    }));
  };

  const handleHoursChange = (employeeId: string, field: 'hours_worked' | 'extra_hours', value: number) => {
    const current = attendances[employeeId] || {
      employee_id: employeeId,
      date: currentDate,
      status: 'presente' as AttendanceStatus,
      hours_worked: 8,
      extra_hours: 0,
    };

    setAttendances(prev => ({
      ...prev,
      [employeeId]: {
        ...current,
        status: 'presente', // Auto-set presente al ingresar horas
        [field]: value
      }
    }));
  };

  const handleTimeChange = (employeeId: string, field: 'time_in' | 'time_out', value: string) => {
    const current = attendances[employeeId] || {
      employee_id: employeeId,
      date: currentDate,
      status: 'presente' as AttendanceStatus,
      hours_worked: 0,
      extra_hours: 0,
    };

    const updated = { ...current, status: 'presente' as AttendanceStatus, [field]: value };
    
    // Calculate hours if both are present
    if (updated.time_in && updated.time_out) {
      const [inH, inM] = updated.time_in.split(':').map(Number);
      const [outH, outM] = updated.time_out.split(':').map(Number);
      
      let diffHours = outH - inH + (outM - inM) / 60;
      if (diffHours < 0) diffHours += 24; // Handle overnight shift
      
      updated.hours_worked = parseFloat(diffHours.toFixed(2));
    }

    setAttendances(prev => ({
      ...prev,
      [employeeId]: updated
    }));
  };

  const saveAll = () => {
    Object.values(attendances).forEach(att => {
      if (att.status) { // Only save if a status was selected
        store.saveAttendance(att);
      }
    });
    alert("¡Asistencia guardada correctamente!");
  };

  const getStatusColor = (status?: AttendanceStatus) => {
    switch (status) {
      case 'presente': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'falta': return 'bg-red-100 text-red-800 border-red-300';
      case 'permiso': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'vacaciones': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-slate-50 text-slate-400 border-slate-200';
    }
  };

  return (
    <>
      <Header title="Registro de Asistencia Diaria" />

      <div className="p-6 space-y-6">
        {/* Barra superior de controles */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="date"
                value={currentDate}
                readOnly
                disabled
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500 w-full md:w-auto font-medium cursor-not-allowed opacity-80"
              />
            </div>
            
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar empleado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 w-full text-sm"
              />
            </div>
          </div>
          
          <button
            onClick={saveAll}
            className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition shadow-md w-full md:w-auto justify-center"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Asistencia</span>
          </button>
        </div>

        {/* Tabla de Asistencia */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-xs">
                  <th className="p-4">Empleado</th>
                  <th className="p-4">Cargo / Modalidad</th>
                  <th className="p-4 text-center">Estado de Asistencia</th>
                  <th className="p-4 text-center">Ingreso / Salida</th>
                  <th className="p-4 text-center w-28">Hrs Normales</th>
                  <th className="p-4 text-center w-28">Hrs Extra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const att = attendances[emp.id];
                  
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-900 flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm">
                          {emp.full_name.charAt(0)}
                        </div>
                        <span>{emp.full_name}</span>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-800 font-medium">{emp.position}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                          {emp.contract_type}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleStatusChange(emp.id, 'presente')}
                            className={`p-2 rounded-lg border transition-all ${
                              att?.status === 'presente' 
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm' 
                                : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                            }`}
                            title="Presente"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(emp.id, 'falta')}
                            className={`p-2 rounded-lg border transition-all ${
                              att?.status === 'falta' 
                                ? 'bg-red-100 text-red-700 border-red-300 shadow-sm' 
                                : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                            }`}
                            title="Falta"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(emp.id, 'permiso')}
                            className={`p-2 rounded-lg border transition-all ${
                              att?.status === 'permiso' 
                                ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm' 
                                : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                            }`}
                            title="Permiso"
                          >
                            <Coffee className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(emp.id, 'vacaciones')}
                            className={`p-2 rounded-lg border transition-all ${
                              att?.status === 'vacaciones' 
                                ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm' 
                                : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                            }`}
                            title="Vacaciones"
                          >
                            <Plane className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <input
                            type="time"
                            value={att?.time_in ?? ''}
                            onChange={(e) => handleTimeChange(emp.id, 'time_in', e.target.value)}
                            className="w-24 px-2 py-1.5 text-xs text-center border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 bg-white"
                          />
                          <span className="text-slate-400">-</span>
                          <input
                            type="time"
                            value={att?.time_out ?? ''}
                            onChange={(e) => handleTimeChange(emp.id, 'time_out', e.target.value)}
                            className="w-24 px-2 py-1.5 text-xs text-center border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 bg-white"
                          />
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={att?.hours_worked ?? ''}
                          onChange={(e) => handleHoursChange(emp.id, 'hours_worked', Number(e.target.value))}
                          className="w-16 px-2 py-1.5 text-center border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={att?.extra_hours ?? ''}
                          onChange={(e) => handleHoursChange(emp.id, 'extra_hours', Number(e.target.value))}
                          className="w-16 px-2 py-1.5 text-center border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {employees.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No se encontraron empleados activos.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
