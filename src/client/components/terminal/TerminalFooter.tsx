import { cn } from '@client/components/ui/utils';

export interface TerminalFooterProps {
  institutionName?: string;
  academicYear?: number | string;
  version?: string;
  className?: string;
}

export function TerminalFooter({
  institutionName = 'Escola Estadual José Lins do Rego',
  academicYear = 2026,
  version = '1.0.0',
  className,
}: TerminalFooterProps) {
  return (
    <footer
      className={cn(
        'w-full border-t border-slate-200 bg-white/80 py-3 px-6 text-xs text-slate-500 backdrop-blur-xs',
        className,
      )}
    >
      <div className="mx-auto flex max-w-5xl flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-700">InAndOut</span>
          <span>•</span>
          <span>{institutionName}</span>
          <span>•</span>
          <span>Ano Letivo: {academicYear}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Terminal Kiosk v{version}</span>
          <span>•</span>
          <span>© {academicYear} Todos os direitos reservados.</span>
        </div>
      </div>
    </footer>
  );
}
