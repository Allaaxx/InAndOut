import { CoordinationPage } from '@client/pages/CoordinationPage';
import { api } from '@client/services/api';
import type { MovementDTO, UserDTO } from '@shared/dtos';
import {
  AlertLevel,
  IncidentOutcome,
  MovementStatus,
  UserRole,
} from '@shared/enums';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const socketListeners: Record<string, Array<(payload: unknown) => void>> = {};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn((event: string, cb: (payload: unknown) => void) => {
      if (!socketListeners[event]) {
        socketListeners[event] = [];
      }
      socketListeners[event].push(cb);
    }),
    off: vi.fn((event: string, cb: (payload: unknown) => void) => {
      if (socketListeners[event]) {
        socketListeners[event] = socketListeners[event].filter(
          (fn) => fn !== cb,
        );
      }
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock('@client/services/api', () => ({
  api: {
    getCoordinationActiveMovements: vi.fn(),
    resolveMovement: vi.fn(),
    escalateMovement: vi.fn(),
  },
}));

describe('Frontend Seam: Incident Resolution Drawer (Shadcn Sheet) & Saídas em Trânsito', () => {
  const coordUser: UserDTO = {
    id: 'coord-1',
    name: 'Coord. Mariana Alves',
    email: 'coord@linsdorego.edu.br',
    role: UserRole.COORDINATOR,
  };

  const sampleMovements: MovementDTO[] = [
    {
      id: 'mov-1',
      sessionId: 'session-101',
      studentId: 'student-1',
      studentRa: '1001',
      studentFullName: 'Lucas Silva',
      studentPublicName: 'Lucas S.',
      abbreviatedName: 'Lucas S.',
      classCode: '1A',
      subject: 'Matemática',
      roomId: 'SALA-01',
      status: MovementStatus.ESCALATED_TO_COORDINATION,
      alertLevel: AlertLevel.RED,
      startedAt: '2026-03-10T08:00:00.000Z',
      allowedLimitMinutes: 10,
      elapsedMinutes: 20,
      isEmergency: false,
      isGuest: false,
      escalationType: 'MANUAL',
    },
    {
      id: 'mov-2',
      sessionId: 'session-102',
      studentId: 'student-2',
      studentRa: '1002',
      studentFullName: 'João Mendes',
      studentPublicName: 'João M.',
      abbreviatedName: 'João M.',
      classCode: '2B',
      subject: 'Física',
      roomId: 'SALA-02',
      status: MovementStatus.IN_TRANSIT_UNRESOLVED,
      alertLevel: AlertLevel.YELLOW,
      startedAt: '2026-03-10T07:55:00.000Z',
      allowedLimitMinutes: 10,
      elapsedMinutes: 30,
      isEmergency: false,
      isGuest: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(socketListeners)) {
      delete socketListeners[key];
    }
  });

  it('renders Saídas em Trânsito metric counter and badge in DataTable', async () => {
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValueOnce({
      movements: sampleMovements,
    });

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);

    expect(await screen.findByText('Lucas S.')).toBeInTheDocument();
    expect(screen.getByText('João M.')).toBeInTheDocument();

    // Summary metric card for Saídas em Trânsito
    expect(screen.getByText('Saídas em Trânsito')).toBeInTheDocument();

    // Status badges
    expect(
      screen.getAllByText('Escalado para Coordenação').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Saída em Trânsito/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('opens Shadcn Sheet drawer on action click, allows selecting typed outcome, entering notes, and resolving', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValueOnce({
      movements: sampleMovements,
    });
    vi.mocked(api.resolveMovement).mockResolvedValueOnce({
      movement: {
        ...sampleMovements[0],
        status: MovementStatus.RESOLVED,
        outcome: IncidentOutcome.ATTENDED_AT_COORDINATION,
        resolutionNotes: 'Aluno foi orientado na sala da coordenação.',
      },
    });

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);

    await screen.findByText('Lucas S.');

    // Click on action button for the escalated student (mov-1)
    const resolveButtons = screen.getAllByRole('button', {
      name: /(Ação Imediata|Resolver|Detalhes)/i,
    });
    await user.click(resolveButtons[0]);

    // Sheet drawer opens
    expect(await screen.findByText('Resolver Ocorrência')).toBeInTheDocument();
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByText('Lucas S.')).toBeInTheDocument();

    // Select typed outcome (Atendido na Coordenação)
    const outcomeSelect = within(sheet).getByLabelText(/Desfecho/i);
    await user.click(outcomeSelect);
    await user.click(
      await screen.findByRole('option', { name: /Atendido na Coordenação/i }),
    );

    // Enter notes
    const notesInput = within(sheet).getByLabelText(/Observações/i);
    await user.type(notesInput, 'Aluno foi orientado na sala da coordenação.');

    // Click Confirm button
    const confirmButton = within(sheet).getByRole('button', {
      name: /Confirmar Resolução/i,
    });
    await user.click(confirmButton);

    // Verify API called
    await waitFor(() => {
      expect(api.resolveMovement).toHaveBeenCalledTimes(1);
      expect(api.resolveMovement).toHaveBeenCalledWith(
        'mov-1',
        {
          outcome: IncidentOutcome.ATTENDED_AT_COORDINATION,
          notes: 'Aluno foi orientado na sala da coordenação.',
        },
        'valid-coord-jwt',
      );
    });

    // Sheet closes after resolution
    await waitFor(() => {
      expect(screen.queryByText('Resolver Ocorrência')).not.toBeInTheDocument();
    });
  });

  it('allows resolving a Saída em Trânsito movement with Desfecho Evasão', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValueOnce({
      movements: sampleMovements,
    });
    vi.mocked(api.resolveMovement).mockResolvedValueOnce({
      movement: {
        ...sampleMovements[1],
        status: MovementStatus.RESOLVED,
        outcome: IncidentOutcome.EVASION,
        resolutionNotes: 'Aluno não retornou após o término da aula.',
      },
    });

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);

    await screen.findByText('João M.');

    // Filter by Saídas em Trânsito
    const statusFilter = screen.getByLabelText('Filtrar por status');
    await user.click(statusFilter);
    await user.click(
      await screen.findByRole('option', { name: /Pendente de Resolução/i }),
    );

    // Only João M. is visible in the filtered list
    expect(screen.getByText('João M.')).toBeInTheDocument();
    expect(screen.queryByText('Lucas S.')).not.toBeInTheDocument();

    // Click action button for João M.
    const actionButtons = screen.getAllByRole('button', {
      name: /(Ação Imediata|Resolver|Detalhes)/i,
    });
    await user.click(actionButtons[0]);

    // Sheet drawer opens
    expect(await screen.findByText('Resolver Ocorrência')).toBeInTheDocument();
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByText('João M.')).toBeInTheDocument();

    // Select Evasão
    const outcomeSelect = within(sheet).getByLabelText(/Desfecho/i);
    await user.click(outcomeSelect);
    await user.click(await screen.findByRole('option', { name: /Evasão/i }));

    // Enter notes
    const notesInput = within(sheet).getByLabelText(/Observações/i);
    await user.type(notesInput, 'Aluno não retornou após o término da aula.');

    // Confirm
    const confirmButton = within(sheet).getByRole('button', {
      name: /Confirmar Resolução/i,
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(api.resolveMovement).toHaveBeenCalledWith(
        'mov-2',
        {
          outcome: IncidentOutcome.EVASION,
          notes: 'Aluno não retornou após o término da aula.',
        },
        'valid-coord-jwt',
      );
    });
  });
});
