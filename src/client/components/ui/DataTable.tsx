import {
  flexRender,
  getCoreRowModel,
  type ColumnDef as TanStackColumnDef,
  useReactTable,
} from '@tanstack/react-table';
import type React from 'react';
import { useMemo } from 'react';
import { cn } from './utils';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (item: T) => string;
  emptyMessage?: string;
  rowClassName?: (item: T) => string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = 'Nenhum registro encontrado.',
  rowClassName,
  className,
}: DataTableProps<T>) {
  const tanstackColumns = useMemo<TanStackColumnDef<T, unknown>[]>(
    () =>
      columns.map((col) => ({
        id: col.key,
        header: () => col.header,
        cell: ({ row }) => {
          if (col.render) {
            return col.render(row.original);
          }
          const val = (row.original as Record<string, unknown>)[col.key];
          return val !== null && val !== undefined ? String(val) : '';
        },
      })),
    [columns],
  );

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => rowKey(row),
  });

  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-lg border border-slate-200 bg-white',
        className,
      )}
    >
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-3">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-200">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'transition-colors hover:bg-slate-50',
                  rowClassName?.(row.original),
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export type { TanStackColumnDef };
export { flexRender, getCoreRowModel, useReactTable };
