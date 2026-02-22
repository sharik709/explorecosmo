export type GridColumn = {
    id: string;
    label: string;
    width: number;
};

export const reorderColumns = (
    columns: GridColumn[],
    sourceId: string,
    targetId: string
): GridColumn[] => {
    if (sourceId === targetId) {
        return [...columns];
    }

    const sourceIndex = columns.findIndex((column) => column.id === sourceId);
    const targetIndex = columns.findIndex((column) => column.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) {
        return [...columns];
    }

    const next = [...columns];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
};
