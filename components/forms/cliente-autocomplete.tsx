"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Cliente {
  id_cliente: number;
  nombre_completo: string;
}

interface ClienteAutocompleteProps {
  clientes: Cliente[];
  value: number;
  onChange: (id: number) => void;
  placeholder?: string;
}

export function ClienteAutocomplete({
  clientes,
  value,
  onChange,
  placeholder = "Buscar cliente...",
}: ClienteAutocompleteProps) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => clientes.find((c) => c.id_cliente === value),
    [clientes, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 md:h-10 text-base font-normal"
        >
          {selected ? selected.nombre_completo : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No se encontró cliente.</CommandEmpty>
            <CommandGroup>
              {clientes.map((cliente) => (
                <CommandItem
                  key={cliente.id_cliente}
                  value={cliente.nombre_completo}
                  onSelect={() => {
                    onChange(cliente.id_cliente);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === cliente.id_cliente ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {cliente.nombre_completo}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
