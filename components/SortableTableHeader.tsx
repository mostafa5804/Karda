import React from 'react';
import { SortConfig, SortDirection } from '../types';

interface SortableTableHeaderProps<T> {
    sortKey: keyof T;
    sortConfig: SortConfig<T> | null;
    requestSort: (key: keyof T) => void;
    className?: string;
}

// FIX: Changed to a const arrow function and used React.PropsWithChildren to avoid TSX parsing issues with generics.
const SortableTableHeader = <T extends object>({
    sortKey,
    sortConfig,
    requestSort,
    children,
    className
}: React.PropsWithChildren<SortableTableHeaderProps<T>>) => {
    
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
            <span className={`ml-2 ${isSorted && sortConfig?.direction ? 'text-primary' : 'text-base-content/40'}`}>
                {isSorted ? getSortIcon(sortConfig.direction) : '↕'}
            </span>
        </th>
    );
};

export default SortableTableHeader;