import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Filter, X, Users, Building2 } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Department {
  id: string;
  name: string;
}

interface Agent {
  id: string;
  full_name: string;
}

export interface DashboardFiltersState {
  departmentId: string | null;
  agentId: string | null;
  startDate: Date;
  endDate: Date;
  preset: string;
}

interface DashboardFiltersProps {
  filters: DashboardFiltersState;
  onFiltersChange: (filters: DashboardFiltersState) => void;
}

const presets = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '14d', label: 'Últimos 14 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'month', label: 'Este mes' },
  { value: 'custom', label: 'Personalizado' },
];

export function DashboardFilters({ filters, onFiltersChange }: DashboardFiltersProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchDepartments();
    fetchAgents();
  }, []);

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name').order('name');
    if (data) setDepartments(data);
  };

  const fetchAgents = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name');
    if (data) setAgents(data);
  };

  const handlePresetChange = (preset: string) => {
    const today = new Date();
    let startDate = filters.startDate;
    let endDate = today;

    switch (preset) {
      case '7d':
        startDate = subDays(today, 7);
        break;
      case '14d':
        startDate = subDays(today, 14);
        break;
      case '30d':
        startDate = subDays(today, 30);
        break;
      case 'month':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
    }

    onFiltersChange({ ...filters, preset, startDate, endDate });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      departmentId: null,
      agentId: null,
      startDate: subDays(new Date(), 14),
      endDate: new Date(),
      preset: '14d',
    });
  };

  const hasActiveFilters = filters.departmentId || filters.agentId || filters.preset !== '14d';

  return (
    <div className="glass-card rounded-xl p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Filter className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">Filtros Avanzados</h3>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
              Activo
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-8 text-xs">
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8"
          >
            {isExpanded ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2 animate-slide-up">
          {/* Period Preset */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Período</label>
            <Select value={filters.preset} onValueChange={handlePresetChange}>
              <SelectTrigger className="h-9">
                <CalendarIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Departamento</label>
            <Select
              value={filters.departmentId || 'all'}
              onValueChange={(v) => onFiltersChange({ ...filters, departmentId: v === 'all' ? null : v })}
            >
              <SelectTrigger className="h-9">
                <Building2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agent */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Agente</label>
            <Select
              value={filters.agentId || 'all'}
              onValueChange={(v) => onFiltersChange({ ...filters, agentId: v === 'all' ? null : v })}
            >
              <SelectTrigger className="h-9">
                <Users className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los agentes</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {filters.preset === 'custom' && (
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Rango de fechas</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 flex-1 justify-start text-xs">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {format(filters.startDate, 'dd/MM/yy', { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.startDate}
                      onSelect={(date) => date && onFiltersChange({ ...filters, startDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 flex-1 justify-start text-xs">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {format(filters.endDate, 'dd/MM/yy', { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.endDate}
                      onSelect={(date) => date && onFiltersChange({ ...filters, endDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const defaultFilters: DashboardFiltersState = {
  departmentId: null,
  agentId: null,
  startDate: subDays(new Date(), 14),
  endDate: new Date(),
  preset: '14d',
};
