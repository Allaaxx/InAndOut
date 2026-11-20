import { CoordinationPage } from '@client/pages/CoordinationPage';
import { api } from '@client/services/api';
import type { ClassGroupDTO, UserDTO } from '@shared/dtos';
import { UserRole } from '@shared/enums';
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
  },
}));

describe('Frontend Seam: Coordination Classes Catalog (/coordination/classes)', () => {
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
      id: 'class-2025-3b',
      code: '3B',
      name: '3º Ano B',
      academicYear: 2025,
      isActive: false,
      createdAt: '2025-02-01T08:00:00.000Z',
      updatedAt: '2025-12-15T18:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValue({
      movements: [],
    });
    vi.mocked(api.listClasses).mockResolvedValue({
      classes: initialClasses,
    });
  });

  it('navigates via sidebar "Turmas" and displays classes with academicYear and status badges', async () => {
    const user = userEvent.setup();
    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);

    const classesNav = screen.getByTestId('sidebar-nav-classes');
    expect(classesNav).toHaveTextContent('Turmas');

    await user.click(classesNav);

    expect(classesNav).toHaveAttribute('aria-current', 'page');
    expect(api.listClasses).toHaveBeenCalledWith('valid-coord-jwt');

    expect(await screen.findByText('1A')).toBeInTheDocument();
    expect(screen.getByText('1º Ano A')).toBeInTheDocument();
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(screen.getByText('3B')).toBeInTheDocument();
    expect(screen.getByText('3º Ano B')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();

    const row1A = screen.getByText('1A').closest('tr') as HTMLElement;
    expect(within(row1A).getByText('Ativa')).toBeInTheDocument();

    const row3B = screen.getByText('3B').closest('tr') as HTMLElement;
    expect(within(row3B).getByText('Inativa')).toBeInTheDocument();
  });

  it('allows creating a new class via modal dialog and displays it in the table', async () => {
    const user = userEvent.setup();
    const createdClass: ClassGroupDTO = {
      id: 'class-2027-1a',
      code: '1A',
      name: '1º Ano A (2027)',
      academicYear: 2027,
      isActive: true,
      createdAt: '2026-11-20T09:00:00.000Z',
      updatedAt: '2026-11-20T09:00:00.000Z',
    };
    vi.mocked(api.createClass).mockResolvedValue({ classGroup: createdClass });

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);
    await user.click(screen.getByTestId('sidebar-nav-classes'));
    await screen.findByText('1º Ano A');

    await user.click(screen.getByRole('button', { name: /Nova Turma/i }));

    await user.type(screen.getByLabelText(/Código da Turma/i), '1a');
    await user.type(screen.getByLabelText(/Nome da Turma/i), '1º Ano A (2027)');
    const yearInput = screen.getByLabelText(/Ano Letivo/i);
    await user.clear(yearInput);
    await user.type(yearInput, '2027');

    await user.click(screen.getByRole('button', { name: /Cadastrar Turma/i }));

    expect(api.createClass).toHaveBeenCalledWith(
      { code: '1a', name: '1º Ano A (2027)', academicYear: 2027 },
      'valid-coord-jwt',
    );
    expect(await screen.findByText('1º Ano A (2027)')).toBeInTheDocument();
    expect(screen.getByText('2027')).toBeInTheDocument();
  });

  it('allows editing an existing class name and academicYear via modal dialog', async () => {
    const user = userEvent.setup();
    const updatedClass: ClassGroupDTO = {
      ...initialClasses[0],
      name: '1º Ano A — Integral',
      academicYear: 2027,
    };
    vi.mocked(api.updateClass).mockResolvedValue({ classGroup: updatedClass });

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);
    await user.click(screen.getByTestId('sidebar-nav-classes'));
    await screen.findByText('1º Ano A');

    const row1A = screen.getByText('1º Ano A').closest('tr') as HTMLElement;
    await user.click(within(row1A).getByRole('button', { name: /Editar/i }));

    const codeInput = screen.getByLabelText(/Código da Turma/i);
    expect(codeInput).toBeDisabled();

    const nameInput = screen.getByLabelText(/Nome da Turma/i);
    await user.clear(nameInput);
    await user.type(nameInput, '1º Ano A — Integral');

    const yearInput = screen.getByLabelText(/Ano Letivo/i);
    await user.clear(yearInput);
    await user.type(yearInput, '2027');

    await user.click(
      screen.getByRole('button', { name: /Salvar Alterações/i }),
    );

    expect(api.updateClass).toHaveBeenCalledWith(
      'class-2026-1a',
      { name: '1º Ano A — Integral', academicYear: 2027 },
      'valid-coord-jwt',
    );
    expect(await screen.findByText('1º Ano A — Integral')).toBeInTheDocument();
    expect(screen.getByText('2027')).toBeInTheDocument();
  });

  it('toggles class status between active and inactive', async () => {
    const user = userEvent.setup();
    vi.mocked(api.updateClassStatus)
      .mockResolvedValueOnce({
        classGroup: { ...initialClasses[0], isActive: false },
      })
      .mockResolvedValueOnce({
        classGroup: { ...initialClasses[1], isActive: true },
      });

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);
    await user.click(screen.getByTestId('sidebar-nav-classes'));
    await screen.findByText('1º Ano A');

    const row1A = screen.getByText('1º Ano A').closest('tr') as HTMLElement;
    await user.click(within(row1A).getByRole('button', { name: /Desativar/i }));

    expect(api.updateClassStatus).toHaveBeenCalledWith(
      'class-2026-1a',
      { isActive: false },
      'valid-coord-jwt',
    );
    expect(await within(row1A).findByText('Inativa')).toBeInTheDocument();

    const row3B = screen.getByText('3º Ano B').closest('tr') as HTMLElement;
    await user.click(within(row3B).getByRole('button', { name: /Ativar/i }));

    expect(api.updateClassStatus).toHaveBeenCalledWith(
      'class-2025-3b',
      { isActive: true },
      'valid-coord-jwt',
    );
    expect(await within(row3B).findByText('Ativa')).toBeInTheDocument();
  });

  it('surfaces API conflict errors when creating a duplicate class fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createClass).mockRejectedValue(
      new Error(
        'Já existe uma turma cadastrada com o código "1A" para o ano letivo 2026.',
      ),
    );

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);
    await user.click(screen.getByTestId('sidebar-nav-classes'));
    await screen.findByText('1º Ano A');

    await user.click(screen.getByRole('button', { name: /Nova Turma/i }));
    await user.type(screen.getByLabelText(/Código da Turma/i), '1A');
    await user.type(screen.getByLabelText(/Nome da Turma/i), '1º Ano A');
    await user.click(screen.getByRole('button', { name: /Cadastrar Turma/i }));

    expect(
      await screen.findByText(
        /Já existe uma turma cadastrada com o código "1A" para o ano letivo 2026/i,
      ),
    ).toBeInTheDocument();
  });
});
