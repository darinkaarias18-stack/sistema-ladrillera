"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";

interface DataTableToolbarProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export function DataTableToolbar({
  onSearch,
  placeholder = "Buscar...",
  children,
}: DataTableToolbarProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => onSearch(value), 300);
    return () => clearTimeout(timeout);
  }, [value, onSearch]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4">
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-700 shadow-xs"
        />
      </div>

      {children && <div className="flex items-center space-x-2 w-full sm:w-auto">{children}</div>}
    </div>
  );
}
