import { CoordinationPage } from '@client/pages/CoordinationPage';
import { api } from '@client/services/api';
import type {
  ClassGroupDTO,
  StudentDTO,
  StudentHistoryReportDTO,
  UserDTO,
} from '@shared/dtos';
import { AlertLevel, MovementStatus, UserRole } from '@shared/enums';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock('@client/services/api', () => ({
  api: {
    getCoordinationActiveMovements: vi.fn(),
    getOverviewAnalytics: vi.fn(),
    getStudentHistory: vi.fn(),
    exportAnalytics: vi.fn(),
    resolveMovement: vi.fn(),
    listRooms: vi.fn(),
    createRoom: vi.fn(),
    updateRoomStatus: vi.fn(),
    listClasses: vi.fn(),
    createClass: vi.fn(),
    updateClass: vi.fn(),
    updateClassStatus: vi.fn(),
    listStudents: vi.fn(),
    createStudent: vi.fn(),
    updateStudent: vi.fn(),
    updateStudentStatus: vi.fn(),
  },
}));

describe('Frontend Seam: Unified Coordination Students Management & History (/coordination/students)', () => {
  const coordUser: UserDTO = {
    id: 'coord-1',
    name: 'Coord. Mariana Alves',
    email: 'coord@linsdorego.edu.br',
    role: UserRole.COORDINATOR,
  };

  const initialClasses: ClassGroupDTO[] = [
    {
      id: 'class-2026-1a',
      code: '1A',
      name: '1º Ano A',
      academicYear: 2026,
      isActive: true,
      createdAt: '2026-03-10T08:00:00.000Z',
      updatedAt: '2026-03-10T08:00:00.000Z',
    },
    {
      id: 'class-2026-2b',
      code: '2B',
      name: '2º Ano B',
      academicYear: 2026,
      isActive: true,
      createdAt: '2026-03-10T08:00:00.000Z',
      updatedAt: '2026-03-10T08:00:00.000Z',
    },
    {
      id: 'class-2025-3b',
      code: '3B',
      name: '3º Ano B',
      academicYear: 2025,
      isActive: false,
      createdAt: '2025-02-01T08:00:00.000Z',
      updatedAt: '2025-12-15T18:00:00.000Z',
    },
  ];

  const initialStudents: StudentDTO[] = [
    {
      id: 'student-1',
      ra: '1001',
      fullName: 'Lucas Silva',
      publicName: 'Lucas S.',
      abbreviatedName: 'Lucas S.',
      classGroupId: 'class-2026-1a',
      classCode: '1A',
      hasSpecialCondition: false,
      isActive: true,
    },
    {
      id: 'student-3',
      ra: '1003',
      fullName: 'Ana Costa',
      publicName: 'Ana C.',
      abbreviatedName: 'Ana C.',
      classGroupId: 'class-2026-1a',
      classCode: '1A',
      hasSpecialCondition: true,
      specialLimitMinutes: 20,
      specialTimeLimitMinutes: 20,
      isActive: true,
    },
    {
      id: 'student-4',
      ra: '2001',
      fullName: 'Pedro Alves',
      publicName: 'Pedro A.',
      abbreviatedName: 'Pedro A.',
      classGroupId: 'class-2026-2b',
      classCode: '2B',
      hasSpecialCondition: false,
      isActive: false,
    },
  ];

  const mockStudentHistory: StudentHistoryReportDTO = {
    student: {
      id: 'student-1',
      ra: '1001',
      fullName: 'Lucas Silva',
      name: 'Lucas Silva',
      classCode: '1A',
    },
    summary: {
      totalExits: 1,
      totalDepartures: 1,
      totalAbsentMinutes: 8,
      totalMinutesOutside: 8,
      averageDurationMinutes: 8,
      averageDurationPerExit: 8,
      attendedMinutes: 42,
      attendancePercentage: 84,
      effectiveAttendancePercentage: 84,
    },
    history: [
      {
        id: 'mov-1',
        sessionId: 'sess-1',
        studentId: 'student-1',
        studentRa: '1001',
        studentFullName: 'Lucas Silva',
        studentPublicName: 'Lucas S.',
        classCode: '1A',
        subject: 'História',
        status: MovementStatus.RETURNED_NORMAL,
        alertLevel: AlertLevel.GREEN,
        startedAt: '2026-03-10T08:00:00.000Z',
        endedAt: '2026-03-10T08:08:00.000Z',
        allowedLimitMinutes: 10,
        durationMinutes: 8,
        attendedMinutes: 42,
        attendancePercentage: 84,
        isEmergency: false,
        isGuest: false,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValue({
      movements: [],
    });
    vi.mocked(api.listClasses).mockResolvedValue({
      classes: initialClasses,
    });
    vi.mocked(api.listStudents).mockResolvedValue({
      students: initialStudents,
    });
  });

  it('navigates via sidebar "Alunos", displays students with Tempo Especial & status badges, and filters by search/Turma/status', async () => {
    const user = userEvent.setup();
    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);

    const studentsNav = screen.getByTestId('sidebar-nav-students');
    expect(studentsNav).toHaveTextContent('Alunos');
    await user.click(studentsNav);

    expect(studentsNav).toHaveAttribute('aria-current', 'page');
    expect(api.listStudents).toHaveBeenCalledWith('valid-coord-jwt');

    expect(await screen.findByText('Lucas Silva')).toBeInTheDocument();
    expect(screen.getByText('Ana Costa')).toBeInTheDocument();
    expect(screen.getByText('Pedro Alves')).toBeInTheDocument();

    const rowAna = screen.getByText('Ana Costa').closest('tr') as HTMLElement;
    expect(within(rowAna).getByText(/20 min/i)).toBeInTheDocument();
    expect(within(rowAna).getByText('Ativo')).toBeInTheDocument();

    const rowPedro = screen
      .getByText('Pedro Alves')
      .closest('tr') as HTMLElement;
    expect(within(rowPedro).getByText('Inativo')).toBeInTheDocument();

    // Filter by search (name or RA)
    const searchInput = screen.getByPlaceholderText(/Buscar por nome ou RA/i);
    await user.type(searchInput, '1003');
    expect(screen.getByText('Ana Costa')).toBeInTheDocument();
    expect(screen.queryByText('Lucas Silva')).not.toBeInTheDocument();
    await user.clear(searchInput);

    // Filter by Turma
    const classFilter = screen.getByLabelText(/Filtrar por Turma/i);
    await user.click(classFilter);
    await user.click(await screen.findByRole('option', { name: /2º Ano B/i }));
    expect(screen.getByText('Pedro Alves')).toBeInTheDocument();
    expect(screen.queryByText('Lucas Silva')).not.toBeInTheDocument();
    await user.click(classFilter);
    await user.click(
      await screen.findByRole('option', { name: /Todas as turmas/i }),
    );

    // Filter by status
    const statusFilter = screen.getByLabelText(/Filtrar por Status/i);
    await user.click(statusFilter);
    await user.click(await screen.findByRole('option', { name: /Inativos/i }));
    expect(screen.getByText('Pedro Alves')).toBeInTheDocument();
    expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument();
  });

  it('creates a new student via modal dialog with active Turma and Tempo Especial', async () => {
    const user = userEvent.setup();
    const createdStudent: StudentDTO = {
      id: 'student-5',
      ra: '4001',
      fullName: 'Mariana Souza',
      publicName: 'Mariana S.',
      abbreviatedName: 'Mariana S.',
      classGroupId: 'class-2026-2b',
      classCode: '2B',
      hasSpecialCondition: true,
      specialLimitMinutes: 15,
      specialTimeLimitMinutes: 15,
      isActive: true,
    };
    vi.mocked(api.createStudent).mockResolvedValue({ student: createdStudent });

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);
    await user.click(screen.getByTestId('sidebar-nav-students'));
    await screen.findByText('Lucas Silva');

    await user.click(screen.getByRole('button', { name: /Novo Aluno/i }));

    await user.type(screen.getByLabelText(/^RA$/i), '4001');
    await user.type(screen.getByLabelText(/Nome Completo/i), 'Mariana Souza');

    const turmaSelect = screen.getByLabelText(/^Turma$/i);
    await user.click(turmaSelect);
    // Inactive 3B must not be offered in active selector
    expect(
      screen.queryByRole('option', { name: /3B/ }),
    ).not.toBeInTheDocument();
    await user.click(await screen.findByRole('option', { name: /2B/ }));

    await user.click(screen.getByLabelText(/Tempo Especial/i));
    const minutesInput = screen.getByLabelText(/Limite Especial \(min\)/i);
    await user.clear(minutesInput);
    await user.type(minutesInput, '15');

    await user.click(screen.getByRole('button', { name: /Cadastrar Aluno/i }));

    expect(api.createStudent).toHaveBeenCalledWith(
      {
        ra: '4001',
        fullName: 'Mariana Souza',
        classGroupId: 'class-2026-2b',
        hasSpecialCondition: true,
        specialLimitMinutes: 15,
      },
      'valid-coord-jwt',
    );
    expect(await screen.findByText('Mariana Souza')).toBeInTheDocument();
  });

  it('edits an existing student with RA disabled, transfers Turma, clears Tempo Especial, and toggles status', async () => {
    const user = userEvent.setup();
    const updatedAna: StudentDTO = {
      ...initialStudents[1],
      fullName: 'Ana Costa Lima',
      classGroupId: 'class-2026-2b',
      classCode: '2B',
      hasSpecialCondition: false,
      specialLimitMinutes: undefined,
      specialTimeLimitMinutes: undefined,
    };
    vi.mocked(api.updateStudent).mockResolvedValue({ student: updatedAna });
    vi.mocked(api.updateStudentStatus).mockResolvedValue({
      student: { ...updatedAna, isActive: false },
    });

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);
    await user.click(screen.getByTestId('sidebar-nav-students'));
    await screen.findByText('Ana Costa');

    const rowAna = screen.getByText('Ana Costa').closest('tr') as HTMLElement;
    await user.click(within(rowAna).getByRole('button', { name: /Editar/i }));

    const raInput = screen.getByLabelText(/^RA$/i);
    expect(raInput).toBeDisabled();

    const nameInput = screen.getByLabelText(/Nome Completo/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Ana Costa Lima');

    await user.click(screen.getByLabelText(/^Turma$/i));
    await user.click(await screen.findByRole('option', { name: /2B/ }));

    // Uncheck Tempo Especial
    await user.click(screen.getByLabelText(/Tempo Especial/i));

    await user.click(
      screen.getByRole('button', { name: /Salvar Alterações/i }),
    );

    expect(api.updateStudent).toHaveBeenCalledWith(
      'student-3',
      {
        fullName: 'Ana Costa Lima',
        classGroupId: 'class-2026-2b',
        hasSpecialCondition: false,
        specialLimitMinutes: null,
      },
      'valid-coord-jwt',
    );

    const updatedRow = (await screen.findByText('Ana Costa Lima')).closest(
      'tr',
    ) as HTMLElement;
    expect(within(updatedRow).getByText('2B')).toBeInTheDocument();

    // Toggle status to Inativo
    await user.click(
      within(updatedRow).getByRole('button', { name: /Desativar/i }),
    );
    expect(api.updateStudentStatus).toHaveBeenCalledWith(
      'student-3',
      { isActive: false },
      'valid-coord-jwt',
    );
    expect(await within(updatedRow).findByText('Inativo')).toBeInTheDocument();
  });

  it('opens student movement history directly from catalog row and triggers Excel/PDF export', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getStudentHistory).mockResolvedValue(mockStudentHistory);
    vi.mocked(api.exportAnalytics).mockResolvedValue(new Blob(['report']));

    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);
    await user.click(screen.getByTestId('sidebar-nav-students'));
    await screen.findByText('Lucas Silva');

    const rowLucas = screen
      .getByText('Lucas Silva')
      .closest('tr') as HTMLElement;
    await user.click(
      within(rowLucas).getByRole('button', { name: /Histórico/i }),
    );

    expect(api.getStudentHistory).toHaveBeenCalledWith(
      '1001',
      expect.anything(),
      'valid-coord-jwt',
    );
    expect(await screen.findByText('História')).toBeInTheDocument();
    expect(screen.getAllByText('84%').length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole('button', { name: /Exportar Excel/i }));
    expect(api.exportAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'xlsx', ra: '1001' }),
      'valid-coord-jwt',
    );

    await user.click(screen.getByRole('button', { name: /Exportar PDF/i }));
    expect(api.exportAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'pdf', ra: '1001' }),
      'valid-coord-jwt',
    );
  });

  it('surfaces API conflict errors when creating a student with duplicate RA fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createStudent).mockRejectedValue(
      new Error('Já existe um aluno cadastrado com o RA "1001".'),
    );

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);
    await user.click(screen.getByTestId('sidebar-nav-students'));
    await screen.findByText('Lucas Silva');

    await user.click(screen.getByRole('button', { name: /Novo Aluno/i }));
    await user.type(screen.getByLabelText(/^RA$/i), '1001');
    await user.type(screen.getByLabelText(/Nome Completo/i), 'Lucas Duplicado');
    await user.click(screen.getByLabelText(/^Turma$/i));
    await user.click(await screen.findByRole('option', { name: /1A/ }));
    await user.click(screen.getByRole('button', { name: /Cadastrar Aluno/i }));

    expect(
      await screen.findByText(/Já existe um aluno cadastrado com o RA "1001"/i),
    ).toBeInTheDocument();
  });

  it('preserves an inactive current Turma when editing a student so name or Tempo Especial can be updated without involuntary transfer', async () => {
    const user = userEvent.setup();
    const studentInInactiveClass: StudentDTO = {
      id: 'student-legacy',
      ra: '3009',
      fullName: 'Beatriz Rocha',
      publicName: 'Beatriz R.',
      abbreviatedName: 'Beatriz R.',
      classGroupId: 'class-2025-3b',
      classCode: '3B',
      hasSpecialCondition: false,
      isActive: true,
    };
    vi.mocked(api.listStudents).mockResolvedValue({
      students: [...initialStudents, studentInInactiveClass],
    });
    vi.mocked(api.updateStudent).mockResolvedValue({
      student: {
        ...studentInInactiveClass,
        fullName: 'Beatriz Rocha Lima',
        hasSpecialCondition: true,
        specialLimitMinutes: 15,
        specialTimeLimitMinutes: 15,
      },
    });

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);
    await user.click(screen.getByTestId('sidebar-nav-students'));
    await screen.findByText('Beatriz Rocha');

    const rowBeatriz = screen
      .getByText('Beatriz Rocha')
      .closest('tr') as HTMLElement;
    await user.click(
      within(rowBeatriz).getByRole('button', { name: /Editar/i }),
    );

    const nameInput = screen.getByLabelText(/Nome Completo/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Beatriz Rocha Lima');

    await user.click(screen.getByLabelText(/Tempo Especial/i));
    await user.click(
      screen.getByRole('button', { name: /Salvar Alterações/i }),
    );

    expect(api.updateStudent).toHaveBeenCalledWith(
      'student-legacy',
      {
        fullName: 'Beatriz Rocha Lima',
        classGroupId: 'class-2025-3b',
        hasSpecialCondition: true,
        specialLimitMinutes: 15,
      },
      'valid-coord-jwt',
    );
  });
});
