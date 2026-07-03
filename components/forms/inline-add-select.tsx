"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface InlineAddSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onAdd: (label: string) => Promise<string | void>;
  placeholder?: string;
  addLabel?: string;
}

export function InlineAddSelect({
  options,
  value,
  onChange,
  onAdd,
  placeholder = "Seleccionar...",
  addLabel = "Agregar nuevo...",
}: InlineAddSelectProps) {
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSelect = (selected: string) => {
    if (selected === "__ADD_NEW__") {
      setAdding(true);
      return;
    }
    onChange(selected);
  };

  const handleSave = async () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const createdValue = await onAdd(trimmed);
      onChange(createdValue || trimmed);
      setAdding(false);
      setNewValue("");
    } finally {
      setLoading(false);
    }
  };

  if (adding) {
    return (
      <div className="flex gap-2">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Nuevo valor..."
          className="h-12 md:h-10 text-base"
          autoFocus
        />
        <Button type="button" onClick={handleSave} disabled={loading} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Guardar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setAdding(false);
            setNewValue("");
          }}
        >
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <Select value={value || "__EMPTY__"} onValueChange={handleSelect}>
      <SelectTrigger className="h-12 md:h-10 text-base">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__EMPTY__">{placeholder}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
        <SelectItem value="__ADD_NEW__" className="font-medium text-amber-600">
          {addLabel}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
