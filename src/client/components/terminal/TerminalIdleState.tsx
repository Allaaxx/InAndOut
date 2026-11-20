import { Badge } from '@client/components/ui/Badge';
import { Button } from '@client/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import { ArrowLeftRight, DoorOpen, Play } from 'lucide-react';

export interface TerminalIdleStateProps {
  roomId: string;
  onStartSessionClick: () => void;
  onChangeRoomClick: () => void;
}

export function TerminalIdleState({
  roomId,
  onStartSessionClick,
  onChangeRoomClick,
}: TerminalIdleStateProps) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge
            variant="secondary"
            data-testid="idle-room-badge"
            className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold"
          >
            <DoorOpen className="h-4 w-4 text-indigo-600" />
            <span>{roomId}</span>
          </Badge>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Sala em espera
          </span>
        </div>

        <div className="space-y-2">
          <CardTitle className="text-xl text-slate-900">
            Nenhuma aula ativa no momento
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed text-slate-600">
            Este terminal está vinculado à sala <strong>{roomId}</strong> e
            aguarda o início de uma sessão de aula pelo professor. Enquanto não
            houver aula ativa, o registro de saídas de estudantes permanece
            bloqueado.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={onStartSessionClick}
          >
            <Play className="mr-2 h-4 w-4" />
            Iniciar Aula
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={onChangeRoomClick}
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Trocar de Sala
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
