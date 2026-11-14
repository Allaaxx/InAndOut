import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TerminalPage } from '@client/pages/TerminalPage';
import { api } from '@client/services/api';
import { SessionStatus, UserRole } from '@shared/enums';

vi.mock('@client/services/api', () => ({
  api: {
    login: vi.fn(),
    verifyPin: vi.fn(),
    refreshToken: vi.fn(),
    getActiveSession: vi.fn(),
    startSession: vi.fn(),
    endSession: vi.fn(),
  },
}));

describe('Frontend Seam: Classroom Terminal Session Lifecycle (Selection, Active Header & End Confirmation)', () => {
  const teacherUser = {
    id: 'teacher-1',
    name: 'Prof. Carlos Eduardo',
    email: 'prof@linsdorego.edu.br',
    role: UserRole.TEACHER,
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
      />
    );

    // 1. Select Turma and Disciplina to start a class session
    const classSelect = await screen.findByLabelText(/Turma/i);
    const subjectSelect = screen.getByLabelText(/Disciplina/i);

    await user.selectOptions(classSelect, '2A');
    await user.selectOptions(subjectSelect, 'História');

    const startBtn = screen.getByRole('button', {
      name: /Iniciar Sessão de Aula/i,
    });
    await user.click(startBtn);

    await waitFor(() => {
      expect(api.startSession).toHaveBeenCalledWith(
        expect.objectContaining({
          classCode: '2A',
          subject: 'História',
          plannedDurationMinutes: 50,
        }),
        'jwt-access-token'
      );
    });

    // 2. Active lesson header is rendered with Turma, Disciplina, and elapsed timer
    expect(await screen.findByText(/Aula em Andamento/i)).toBeInTheDocument();
    expect(screen.getByText(/Turma 2A/i)).toBeInTheDocument();
    expect(screen.getByText(/História/i)).toBeInTheDocument();
    expect(screen.getByTestId('session-elapsed-timer')).toHaveTextContent(
      /02:0[56]/
    );

    // 3. Clicking "Encerrar Aula" opens the confirmation dialog
    const endBtn = screen.getByRole('button', { name: /Encerrar Aula/i });
    await user.click(endBtn);

    expect(
      await screen.findByRole('heading', {
        name: /Confirmar Encerramento de Aula/i,
      })
    ).toBeInTheDocument();

    // 4. Confirming in the dialog ends the session and shows consolidated metrics
    const confirmEndBtn = screen.getByRole('button', {
      name: /Confirmar Encerramento/i,
    });
    await user.click(confirmEndBtn);

    await waitFor(() => {
      expect(api.endSession).toHaveBeenCalledWith(
        { sessionId: 'session-101' },
        'jwt-access-token'
      );
    });

    expect(
      await screen.findByText(/Sessão de aula encerrada/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Turma/i)).toBeInTheDocument();
  });
});
