import { type ColumnDef, DataTable } from '@client/components/ui/DataTable';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

interface TestItem {
  id: string;
  name: string;
  role: string;
  count: number;
}

const sampleData: TestItem[] = [
  { id: '1', name: 'Alice', role: 'Developer', count: 10 },
  { id: '2', name: 'Bob', role: 'Designer', count: 5 },
  { id: '3', name: 'Charlie', role: 'Manager', count: 8 },
];

const columns: ColumnDef<TestItem>[] = [
  { key: 'id', header: 'ID' },
  {
    key: 'name',
    header: 'Nome',
    render: (item) => (
      <span data-testid={`name-${item.id}`}>{item.name.toUpperCase()}</span>
    ),
  },
  { key: 'role', header: 'Cargo' },
  {
    key: 'count',
    header: 'Pontos',
    render: (item) => <strong>{item.count * 2} pts</strong>,
  },
];

function DynamicTable() {
  const [items, setItems] = useState(sampleData);
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          setItems((prev) => [
            ...prev,
            { id: '4', name: 'Diana', role: 'Analyst', count: 12 },
          ])
        }
      >
        Adicionar Item
      </button>
      <DataTable columns={columns} data={items} rowKey={(item) => item.id} />
    </div>
  );
}

describe('UI Component: DataTable (with @tanstack/react-table)', () => {
  it('renders table headers and data rows correctly using TanStack Table', () => {
    render(
      <DataTable
        columns={columns}
        data={sampleData}
        rowKey={(item) => item.id}
      />,
    );

    // Headers
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Cargo')).toBeInTheDocument();
    expect(screen.getByText('Pontos')).toBeInTheDocument();

    // Custom cell render
    expect(screen.getByTestId('name-1')).toHaveTextContent('ALICE');
    expect(screen.getByTestId('name-2')).toHaveTextContent('BOB');
    expect(screen.getByTestId('name-3')).toHaveTextContent('CHARLIE');

    // Default cell fallback (string value for role & id)
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('Designer')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();

    // Expression render
    expect(screen.getByText('20 pts')).toBeInTheDocument();
    expect(screen.getByText('10 pts')).toBeInTheDocument();
    expect(screen.getByText('16 pts')).toBeInTheDocument();
  });

  it('renders default empty message when data is empty', () => {
    render(
      <DataTable columns={columns} data={[]} rowKey={(item) => item.id} />,
    );

    expect(screen.getByText('Nenhum registro encontrado.')).toBeInTheDocument();
  });

  it('renders custom empty message when provided', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(item) => item.id}
        emptyMessage="Nenhum estudante em trânsito no momento."
      />,
    );

    expect(
      screen.getByText('Nenhum estudante em trânsito no momento.'),
    ).toBeInTheDocument();
  });

  it('applies rowClassName dynamically to rows', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={sampleData}
        rowKey={(item) => item.id}
        rowClassName={(item) => (item.id === '1' ? 'bg-red-50' : 'bg-green-50')}
      />,
    );

    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].className).toContain('bg-red-50');
    expect(rows[1].className).toContain('bg-green-50');
    expect(rows[2].className).toContain('bg-green-50');
  });

  it('reactively updates rows when data changes', async () => {
    const user = userEvent.setup();
    render(<DynamicTable />);

    expect(screen.queryByText('Diana')).not.toBeInTheDocument();
    await user.click(screen.getByText('Adicionar Item'));
    expect(await screen.findByText('DIANA')).toBeInTheDocument();
    expect(screen.getByText('Analyst')).toBeInTheDocument();
    expect(screen.getByText('24 pts')).toBeInTheDocument();
  });
});
