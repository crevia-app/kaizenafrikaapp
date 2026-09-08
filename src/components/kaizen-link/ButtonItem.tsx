import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Link2, ChevronUp, ChevronDown } from "lucide-react";
import { iconMap } from "./iconOptions";

interface ButtonItemProps {
  button: any;
  onEdit: (button: any) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, visible: boolean) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function ButtonItem({ button, onEdit, onDelete, onToggleVisibility, onMoveUp, onMoveDown, isFirst, isLast }: ButtonItemProps) {
  const Icon = iconMap[button.icon] || Link2;

  return (
    <Card className="p-3 sm:p-4 hover-lift group">
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
        {/* Move up/down buttons */}
        <div className="flex flex-col gap-0 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMoveUp?.(button.id)}
            disabled={isFirst}
            className="h-9 w-9 p-0 disabled:opacity-20 text-bronze hover:text-bronze hover:bg-bronze/10"
          >
            <ChevronUp className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMoveDown?.(button.id)}
            disabled={isLast}
            className="h-9 w-9 p-0 disabled:opacity-20 text-bronze hover:text-bronze hover:bg-bronze/10"
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
            button.style === 'filled' 
              ? 'bg-bronze text-white group-hover:scale-110' 
              : button.style === 'outline'
              ? 'border-2 border-bronze text-bronze group-hover:scale-110'
              : 'text-bronze group-hover:scale-110'
          }`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm sm:text-base truncate">{button.title}</p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{button.url}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Switch
            checked={button.visible}
            onCheckedChange={(checked) => onToggleVisibility(button.id, checked)}
            className="scale-90 sm:scale-100"
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(button)}
            className="transition-all duration-300 hover:scale-110 h-11 w-11 md:h-10 md:w-10"
          >
            <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(button.id)}
            className="transition-all duration-300 hover:scale-110 h-11 w-11 md:h-10 md:w-10"
          >
            <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
