import { Color } from "../types";
import { rowLastEditedTimeUpdate } from "./row-state-operations";
import { TagIdError } from "./table-error";
import { TableState } from "./types";
import { createTag } from "src/data/table-state-factory";

export const tagAddNew = (
	prevState: TableState,
	cellId: string,
	columnId: string,
	rowId: string,
	markdown: string,
	color: Color,
	canAddMultiple: boolean
) => {
	const { tags, bodyRows } = prevState.model;

	const tagsCopy = structuredClone(tags);

	if (!canAddMultiple) {
		const tag = tagsCopy.find((t) => t.cellIds.find((c) => c === cellId));
		//If there was already a tag selected for this cell
		if (tag) {
			const arr = tag.cellIds.filter((c) => c !== cellId);
			tag.cellIds = arr;
		}
	}

	tagsCopy.push(createTag(columnId, markdown, { color, cellId }));
	return {
		...prevState,
		model: {
			...prevState.model,
			tags: tagsCopy,
			bodyRows: rowLastEditedTimeUpdate(bodyRows, rowId),
		},
	};
};

export const tagRemoveCell = (
	prevState: TableState,
	cellId: string,
	rowId: string,
	tagId: string
) => {
	const { tags, bodyRows } = prevState.model;

	const tagsCopy = structuredClone(tags);
	const tag = tagsCopy.find((t) => t.id === tagId);

	if (!tag) throw new TagIdError(tagId);

	const arr = tag.cellIds.filter((c) => c !== cellId);
	tag.cellIds = arr;

	return {
		...prevState,
		model: {
			...prevState.model,
			tags: tagsCopy,
			bodyRows: rowLastEditedTimeUpdate(bodyRows, rowId),
		},
	};
};

export const tagAddCell = (
	prevState: TableState,
	cellId: string,
	rowId: string,
	tagId: string,
	canAddMultiple: boolean
): TableState => {
	const { tags, bodyRows } = prevState.model;
	const tagsCopy = structuredClone(tags);

	if (!canAddMultiple) {
		const tag = tagsCopy.find((t) => t.cellIds.find((c) => c == cellId));
		if (tag) {
			//If we click on the same cell, then return
			if (tag.id === tagId) return prevState;
			const arr = tag.cellIds.filter((c) => c !== cellId);
			tag.cellIds = arr;
		}
	}

	const tag = tagsCopy.find((t) => t.id === tagId);
	if (!tag) throw new TagIdError(tagId);
	const index = tagsCopy.indexOf(tag);
	tagsCopy[index].cellIds.push(cellId);

	return {
		...prevState,
		model: {
			...prevState.model,
			tags: tagsCopy,
			bodyRows: rowLastEditedTimeUpdate(bodyRows, rowId),
		},
	};
};
