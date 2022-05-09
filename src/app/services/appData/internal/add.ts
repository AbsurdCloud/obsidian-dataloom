import { AppData } from "../state/appData";
import { initialCell } from "../state/cell";
import { initialHeader } from "../state/header";
import { initialRow } from "../state/row";
import { initialTag, Tag } from "../state/tag";
import { CELL_TYPE } from "src/app/constants";
import { randomCellId, randomColumnId, randomRowId } from "../../random";

//TODO add tests
export const addRow = (data: AppData): AppData => {
	const rowId = randomRowId();
	const tags: Tag[] = [];
	const cells = data.headers.map((header, i) => {
		const cellId = randomCellId();
		if (header.type === CELL_TYPE.TAG)
			tags.push(initialTag(header.id, cellId, "", ""));
		return initialCell(cellId, rowId, header.id, header.type, "");
	});
	return {
		...data,
		updateTime: Date.now(),
		rows: [...data.rows, initialRow(rowId, Date.now())],
		cells: [...data.cells, ...cells],
		tags: [...data.tags, ...tags],
	};
};

export const addColumn = (data: AppData): AppData => {
	const header = initialHeader(
		randomColumnId(),
		`Column ${data.headers.length}`
	);
	const cells = [...data.cells];
	data.rows.forEach((row) => {
		cells.push(
			initialCell(randomCellId(), row.id, header.id, CELL_TYPE.TEXT, "")
		);
	});
	return {
		...data,
		updateTime: Date.now(),
		headers: [...data.headers, header],
		cells,
	};
};
