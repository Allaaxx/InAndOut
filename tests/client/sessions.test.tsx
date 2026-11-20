import { TerminalPage } from '@client/pages/TerminalPage';
import { api } from '@client/services/api';
import { SessionStatus, UserRole } from '@shared/enums';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@client/services/api', () => ({
  api: {
    login: vi.fn(),
    verifyPin: vi.fn(),
    refreshToken: vi.fn(),
    getActiveSession: vi.fn(),
    startSession: vi.fn(),
    endSession: vi.fn(),
    listClasses: vi.fn(),
  },
}));

describe('Frontend Seam: Classroom Terminal Session Lifecycle (Selection, Active Header & End Confirmation)', () => {
  const teacherUser = {
    id: 'teacher-1',
    name: 'Prof. Carlos Eduardo',
    email: 'prof@linsdorego.edu.br',
    role: UserRole.TEACHER,
  };

  const activeClasses = [
    {
      id: 'class-2026-1a',
      code: '1A',
      name: '1º Ano A',
      academicYear: 2026,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'class-2026-2a',
      code: '2A',
      name: '2º Ano A',
      academicYear: 2026,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listClasses).mockResolvedValue({
      classes: activeClasses,
    });
  });

  it('allows the teacher to select Turma and Disciplina to start a session, displays the active lesson header with elapsed timer, and confirms ending the lesson via dialog', async () => {
    const user = userEvent.setup();

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: null,
      activeMovements: [],
      queue: [],
    });

    const activeSessionDTO = {
      id: 'session-101',
      teacherId: teacherUser.id,
      teacherName: teacherUser.name,
      roomId: 'SALA-01',
      classCode: '2A',
      subject: 'História',
      status: SessionStatus.ACTIVE,
      startedAt: new Date(Date.now() - 125_000).toISOString(), // 2m 05s ago
      plannedDurationMinutes: 50,
      defaultTimeLimitMinutes: 10,
    };

    vi.mocked(api.startSession).mockResolvedValueOnce({
      session: activeSessionDTO,
    });

    vi.mocked(api.endSession).mockResolvedValueOnce({
      session: {
        ...activeSessionDTO,
        status: SessionStatus.ENDED,
        endedAt: new Date().toISOString(),
      },
      metrics: {
        totalExits: 3,
        inTransitUnresolvedCount: 0,
        elapsedMinutes: 50,
      },
      inTransitMovements: [],
    });

    render(
      <TerminalPage
        user={teacherUser}
        token="jwt-access-token"
        onVerifyPin={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    // 1. Click "Iniciar Aula" to open the session modal and select Turma and Disciplina
    await user.click(
      await screen.findByRole('button', { name: /Iniciar Aula/i }),
    );
    await waitFor(() => {
      expect(api.listClasses).toHaveBeenCalledWith('jwt-access-token', {
        onlyActive: true,
      });
    });

    const classSelect = await screen.findByLabelText(/Turma/i);
    const subjectSelect = screen.getByLabelText(/Disciplina/i);

    await user.click(classSelect);
    await user.click(
      await screen.findByRole('option', { name: /2A — 2º Ano A \(2026\)/i }),
    );

    await user.click(subjectSelect);
    await user.click(await screen.findByRole('option', { name: 'História' }));

    const startBtn = screen.getByRole('button', {
      name: /Iniciar Sessão de Aula/i,
    });
    await user.click(startBtn);

    await waitFor(() => {
      expect(api.startSession).toHaveBeenCalledWith(
        expect.objectContaining({
          classGroupId: 'class-2026-2a',
          classCode: '2A',
          subject: 'História',
          plannedDurationMinutes: 50,
        }),
        'jwt-access-token',
      );
    });

    // 2. Active lesson header is rendered with Turma, Disciplina, and elapsed timer
    expect(await screen.findByText(/Aula em Andamento/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Turma 2A/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/História/i)[0]).toBeInTheDocument();
    expect(screen.getByTestId('session-elapsed-timer')).toHaveTextContent(
      /02:0[56]/,
    );

    // 3. Clicking "Encerrar Aula" opens the confirmation dialog
    const endBtn = screen.getByRole('button', { name: /Encerrar Aula/i });
    await user.click(endBtn);

    expect(
      await screen.findByRole('heading', {
        name: /Confirmar Encerramento de Aula/i,
      }),
    ).toBeInTheDocument();

    // 4. Confirming in the dialog ends the session and shows consolidated metrics
    const confirmEndBtn = screen.getByRole('button', {
      name: /Confirmar Encerramento/i,
    });
    await user.click(confirmEndBtn);

    await waitFor(() => {
      expect(api.endSession).toHaveBeenCalledWith(
        { sessionId: 'session-101' },
        'jwt-access-token',
      );
    });

    expect(
      await screen.findByText(/Sessão de aula encerrada/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Iniciar Aula/i }),
    ).toBeInTheDocument();
  });

  it('allows the teacher to select a custom planned duration in StartSessionModal and submits it', async () => {
    const user = userEvent.setup();

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: null,
      activeMovements: [],
      queue: [],
    });

    vi.mocked(api.startSession).mockResolvedValueOnce({
      session: {
        id: 'session-custom-duration',
        teacherId: teacherUser.id,
        teacherName: teacherUser.name,
        roomId: 'SALA-01',
        classCode: '1A',
        subject: 'Matemática',
        status: SessionStatus.ACTIVE,
        startedAt: new Date().toISOString(),
        plannedDurationMinutes: 90,
        defaultTimeLimitMinutes: 10,
      },
    });

    render(
      <TerminalPage
        user={teacherUser}
        token="jwt-access-token"
        onVerifyPin={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    await user.click(
      await screen.findByRole('button', { name: /Iniciar Aula/i }),
    );

    const durationSelect = await screen.findByLabelText(/Duração \(min\)/i);
    await user.click(durationSelect);
    await user.click(await screen.findByRole('option', { name: '90 min' }));

    await user.click(
      screen.getByRole('button', { name: /Iniciar Sessão de Aula/i }),
    );

    await waitFor(() => {
      expect(api.startSession).toHaveBeenCalledWith(
        expect.objectContaining({
          classGroupId: 'class-2026-1a',
          classCode: '1A',
          subject: 'Matemática',
          plannedDurationMinutes: 90,
        }),
        'jwt-access-token',
      );
    });
  });

  it('displays Turma concurrency conflict errors clearly inside StartSessionModal when the selected Turma is active in another room', async () => {
    const user = userEvent.setup();

    vi.mocked(api.getActiveSession).mockResolvedValueOnce({
      session: null,
      activeMovements: [],
      queue: [],
    });

    vi.mocked(api.startSession).mockRejectedValueOnce(
      new Error(
        'A turma 2A já possui uma sessão de aula ativa na sala LAB-01 (Física). Encerre a sessão atual antes de iniciar outra para esta turma.',
      ),
    );

    render(
      <TerminalPage
        user={teacherUser}
        token="jwt-access-token"
        onVerifyPin={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    await user.click(
      await screen.findByRole('button', { name: /Iniciar Aula/i }),
    );

    await waitFor(() => {
      expect(api.listClasses).toHaveBeenCalledWith('jwt-access-token', {
        onlyActive: true,
      });
    });

    await user.click(await screen.findByLabelText(/Turma/i));
    await user.click(
      await screen.findByRole('option', { name: /2A — 2º Ano A \(2026\)/i }),
    );

    await user.click(
      screen.getByRole('button', { name: /Iniciar Sessão de Aula/i }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/turma 2A já possui uma sessão/i);
    expect(alert).toHaveTextContent(/LAB-01/i);
    expect(
      screen.getByRole('heading', { name: /Iniciar Nova Sessão de Aula/i }),
    ).toBeInTheDocument();
  });
});
