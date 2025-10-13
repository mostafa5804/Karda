import React from 'react';
import { SortConfig, SortDirection } from '../types';

interface SortableTableHeaderProps<T> {
    sortKey: keyof T;
    sortConfig: SortConfig<T> | null;
    requestSort: (key: keyof T) => void;
    children: React.ReactNode;
    className?: string;
}

function SortableTableHeader<T extends object>({
    sortKey,
    sortConfig,
    requestSort,
    children,
    className
}: SortableTableHeaderProps<T>) {
    
    const getSortIcon = (direction: SortDirection) => {
        if (!direction) return '↕';
        if (direction === 'asc') return '↑';
        return '↓';
    };

    const isSorted = sortConfig?.key === sortKey;

    return (
        <th
            className={`cursor-pointer select-none ${className || ''}`}
            onClick={() => requestSort(sortKey)}
        >
            {children}
            <span className={`ml-2 ${isSorted && sortConfig?.direction ? 'text-blue-500' : 'text-gray-400'}`}>
                {isSorted ? getSortIcon(sortConfig.direction) : '↕'}
            </span>
        </th>
    );
};

export default SortableTableHeader;