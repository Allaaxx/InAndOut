import { Button } from '@client/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import {
  Bell,
  BellOff,
  Info,
  Radio,
  RefreshCw,
  Sliders,
  Volume2,
} from 'lucide-react';

export interface CoordinationSettingsPageProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onTestSound: () => void;
  onRefreshData?: () => void;
  loading?: boolean;
}

export function CoordinationSettingsPage({
  soundEnabled,
  onToggleSound,
  onTestSound,
  onRefreshData,
  loading = false,
}: CoordinationSettingsPageProps) {
  return (
    <div className="w-full space-y-6">
      {/* Page Description */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Preferências da Coordenação
            </h2>
            <p className="text-sm text-slate-500">
              Configure preferências locais de alertas sonoros e sincronização
              em tempo real
            </p>
          </div>
        </div>
      </div>

      {/* Audio Alerts Section */}
      <Card className="shadow-xs bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-600" />
                Alerta Sonoro de Ocorrências Críticas
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Emite sinal sonoro imediato via Web Audio API quando uma saída
                de aluno for escalada para a Coordenação
              </CardDescription>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                soundEnabled
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {soundEnabled ? 'Ativo' : 'Silenciado'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            O alerta sonoro reproduz um aviso sutil e perceptível diretamente no
            navegador da Coordenação sempre que o tempo limite de saída for
            excedido ou o professor solicitar intervenção imediata.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="button"
              variant={soundEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleSound}
              className="flex items-center gap-2"
              aria-label={
                soundEnabled
                  ? 'Alerta Sonoro: Ativado'
                  : 'Alerta Sonoro: Silenciado'
              }
            >
              {soundEnabled ? (
                <>
                  <Bell className="h-4 w-4" />
                  <span>Alerta Sonoro: Ativado</span>
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4" />
                  <span>Alerta Sonoro: Silenciado</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onTestSound}
              className="flex items-center gap-2 text-slate-700"
              title="Testar som de alerta"
            >
              <Volume2 className="h-4 w-4 text-indigo-600" />
              <span>Testar Som de Alerta</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync & Refresh Rate Section */}
      <Card className="shadow-xs bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Radio className="h-5 w-5 text-indigo-600" />
                Sincronização e Atualização em Tempo Real
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Conexão contínua com os terminais de sala de aula via Socket.io
              </CardDescription>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Conectado
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            As saídas e retornos são transmitidos instantaneamente para a
            Coordenação sem necessidade de recarregar a página. Caso haja
            instabilidade na rede da escola, você pode forçar a sincronização
            manual dos dados a qualquer momento.
          </p>

          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefreshData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              <span>
                {loading
                  ? 'Recarregando Dados...'
                  : 'Recarregar Dados em Tempo Real'}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações do Sistema */}
      <Card className="shadow-xs bg-white">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Info className="h-5 w-5 text-slate-400" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <span className="text-slate-400 uppercase font-semibold">
                Aplicação
              </span>
              <p className="font-bold text-slate-800 mt-0.5">
                InAndOut — Controle de Fluxo
              </p>
              <p className="text-slate-500">Versão 1.0.0 (Shell v2)</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <span className="text-slate-400 uppercase font-semibold">
                Unidade Escolar
              </span>
              <p className="font-bold text-slate-800 mt-0.5">
                Escola Lins do Rego
              </p>
              <p className="text-slate-500">Coordenação Pedagógica</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
