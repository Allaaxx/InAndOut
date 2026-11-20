import { CoordinationPage } from '@client/pages/CoordinationPage';
import { api } from '@client/services/api';
import type { RoomDTO, UserDTO } from '@shared/dtos';
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
  },
}));

describe('Frontend Seam: Coordination Rooms Catalog (/coordination/rooms)', () => {
  const coordUser: UserDTO = {
    id: 'coord-1',
    name: 'Coord. Mariana Alves',
    email: 'coord@linsdorego.edu.br',
    role: UserRole.COORDINATOR,
  };

  const initialRooms: RoomDTO[] = [
    {
      id: 'room-sala-01',
      code: 'SALA-01',
      name: 'Sala 01',
      isActive: true,
      createdAt: '2026-03-10T08:00:00.000Z',
      updatedAt: '2026-03-10T08:00:00.000Z',
    },
    {
      id: 'room-lab-01',
      code: 'LAB-01',
      name: 'Laboratório 01',
      isActive: false,
      createdAt: '2026-03-10T08:00:00.000Z',
      updatedAt: '2026-03-10T08:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getCoordinationActiveMovements).mockResolvedValue({
      movements: [],
    });
    vi.mocked(api.listRooms).mockResolvedValue({
      rooms: initialRooms,
    });
  });

  it('navigates via sidebar "Salas de Aula" and displays rooms with their active/inactive status', async () => {
    const user = userEvent.setup();
    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);

    const roomsNav = screen.getByTestId('sidebar-nav-rooms');
    expect(roomsNav).toHaveTextContent('Salas de Aula');

    await user.click(roomsNav);

    expect(roomsNav).toHaveAttribute('aria-current', 'page');
    expect(api.listRooms).toHaveBeenCalledWith('valid-coord-jwt');

    expect(await screen.findByText('SALA-01')).toBeInTheDocument();
    expect(screen.getByText('Sala 01')).toBeInTheDocument();
    expect(screen.getByText('LAB-01')).toBeInTheDocument();
    expect(screen.getByText('Laboratório 01')).toBeInTheDocument();

    const salaRow = screen.getByText('SALA-01').closest('tr');
    expect(salaRow).not.toBeNull();
    expect(
      within(salaRow as HTMLElement).getByText('Ativa'),
    ).toBeInTheDocument();

    const labRow = screen.getByText('LAB-01').closest('tr');
    expect(labRow).not.toBeNull();
    expect(
      within(labRow as HTMLElement).getByText('Inativa'),
    ).toBeInTheDocument();
  });

  it('allows creating a new room via modal dialog and displays it in the table', async () => {
    const user = userEvent.setup();
    const createdRoom: RoomDTO = {
      id: 'room-sala-04',
      code: 'SALA-04',
      name: 'Sala 04',
      isActive: true,
      createdAt: '2026-03-10T09:00:00.000Z',
      updatedAt: '2026-03-10T09:00:00.000Z',
    };
    vi.mocked(api.createRoom).mockResolvedValue({ room: createdRoom });

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);
    await user.click(screen.getByTestId('sidebar-nav-rooms'));
    await screen.findByText('SALA-01');

    // Open creation dialog
    await user.click(screen.getByRole('button', { name: /Nova Sala/i }));

    const codeInput = screen.getByLabelText(/Código da Sala/i);
    const nameInput = screen.getByLabelText(/Nome da Sala/i);

    await user.type(codeInput, 'SALA-04');
    await user.type(nameInput, 'Sala 04');
    await user.click(screen.getByRole('button', { name: /Cadastrar Sala/i }));

    expect(api.createRoom).toHaveBeenCalledWith(
      { code: 'SALA-04', name: 'Sala 04' },
      'valid-coord-jwt',
    );
    expect(await screen.findByText('SALA-04')).toBeInTheDocument();
    expect(screen.getByText('Sala 04')).toBeInTheDocument();
  });

  it('toggles room status between active and inactive', async () => {
    const user = userEvent.setup();
    vi.mocked(api.updateRoomStatus)
      .mockResolvedValueOnce({
        room: { ...initialRooms[0], isActive: false },
      })
      .mockResolvedValueOnce({
        room: { ...initialRooms[1], isActive: true },
      });

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);
    await user.click(screen.getByTestId('sidebar-nav-rooms'));
    await screen.findByText('SALA-01');

    // Deactivate SALA-01
    const salaRow = screen.getByText('SALA-01').closest('tr') as HTMLElement;
    await user.click(
      within(salaRow).getByRole('button', { name: /Desativar/i }),
    );

    expect(api.updateRoomStatus).toHaveBeenCalledWith(
      'room-sala-01',
      { isActive: false },
      'valid-coord-jwt',
    );
    expect(await within(salaRow).findByText('Inativa')).toBeInTheDocument();

    // Activate LAB-01
    const labRow = screen.getByText('LAB-01').closest('tr') as HTMLElement;
    await user.click(within(labRow).getByRole('button', { name: /Ativar/i }));

    expect(api.updateRoomStatus).toHaveBeenCalledWith(
      'room-lab-01',
      { isActive: true },
      'valid-coord-jwt',
    );
    expect(await within(labRow).findByText('Ativa')).toBeInTheDocument();
  });

  it('shows error message when creating a duplicate room fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createRoom).mockRejectedValue(
      new Error('Já existe uma sala cadastrada com o código "SALA-01".'),
    );

    render(<CoordinationPage user={coordUser} token="valid-coord-jwt" />);
    await user.click(screen.getByTestId('sidebar-nav-rooms'));
    await screen.findByText('SALA-01');

    await user.click(screen.getByRole('button', { name: /Nova Sala/i }));
    await user.type(screen.getByLabelText(/Código da Sala/i), 'SALA-01');
    await user.type(screen.getByLabelText(/Nome da Sala/i), 'Sala Repetida');
    await user.click(screen.getByRole('button', { name: /Cadastrar Sala/i }));

    expect(
      await screen.findByText(
        /Já existe uma sala cadastrada com o código "SALA-01"/i,
      ),
    ).toBeInTheDocument();
  });
});
