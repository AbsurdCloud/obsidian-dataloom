import TableStateCommand from "../table-state/table-state-command";
import { TableState, Tag } from "../types/types";
import { TagNotFoundError } from "../table-state/table-error";

export default class TagDeleteCommand extends TableStateCommand {
	private columnId: string;
	private tagId: string;

	/**
	 * The tag that was deleted from the column
	 */
	private deletedTag: {
		arrIndex: number;
		tag: Tag;
	};

	/**
	 * The previous cell tag ids before the command is executed
	 */
	private previousCellTagIds: {
		cellId: string;
		tagIds: string[];
	}[] = [];

	constructor(columnId: string, tagId: string) {
		super();
		this.columnId = columnId;
		this.tagId = tagId;
	}

	execute(prevState: TableState): TableState {
		super.onExecute();

		const { bodyCells, columns } = prevState.model;

		const newColumns = columns.map((column) => {
			if (column.id === this.columnId) {
				const tag = column.tags.find((tag) => tag.id === this.tagId);
				if (!tag) throw new TagNotFoundError(this.tagId);

				this.deletedTag = {
					arrIndex: column.tags.indexOf(tag),
					tag,
				};

				return {
					...column,
					tags: column.tags.filter((tag) => tag.id !== this.tagId),
				};
			}
			return column;
		});

		const newBodyCells = bodyCells.map((cell) => {
			if (cell.tagIds.includes(this.tagId)) {
				this.previousCellTagIds.push({
					cellId: cell.id,
					tagIds: [...cell.tagIds],
				});

				return {
					...cell,
					tagIds: cell.tagIds.filter((tagId) => tagId !== this.tagId),
				};
			}
			return cell;
		});

		return {
			...prevState,
			model: {
				...prevState.model,
				columns: newColumns,
				bodyCells: newBodyCells,
			},
		};
	}

	redo(prevState: TableState): TableState {
		super.onRedo();
		return this.execute(prevState);
	}

	undo(prevState: TableState): TableState {
		super.onUndo();

		const { columns, bodyCells } = prevState.model;

		const newColumns = columns.map((column) => {
			if (column.id === this.columnId) {
				const updatedTags = [...column.tags];
				updatedTags.splice(
					this.deletedTag.arrIndex,
					0,
					this.deletedTag.tag
				);

				return {
					...column,
					tags: updatedTags,
				};
			}
			return column;
		});

		const newBodyCells = bodyCells.map((cell) => {
			const previousTagIds = this.previousCellTagIds.find(
				(previousCellTagId) => previousCellTagId.cellId === cell.id
			);
			if (previousTagIds) {
				return {
					...cell,
					tagIds: previousTagIds.tagIds,
				};
			}
			return cell;
		});

		return {
			...prevState,
			model: {
				...prevState.model,
				columns: newColumns,
				bodyCells: newBodyCells,
			},
		};
	}
}