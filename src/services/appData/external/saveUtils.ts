import { AppData, Cell } from "../state/types";

import { CONTENT_TYPE } from "src/constants";
import { BaseCell } from "../state/cell";

/**
 * Converts app data to a valid Obsidian markdown string
 * @param data The app data
 * @returns An Obsidian markdown string
 */
export const appDataToMarkdown = (data: AppData): string => {
	const columnCharLengths = calcColumnCharLengths(data);
	const buffer = new AppDataStringBuffer();
	buffer.createRow();

	data.headers.forEach((header, i) => {
		buffer.writeColumn(header.content, columnCharLengths[i]);
	});

	buffer.createRow();

	for (let i = 0; i < data.headers.length; i++) {
		const content = Array(columnCharLengths[i]).fill("-").join("");
		buffer.writeColumn(content, columnCharLengths[i]);
	}

	data.rows.forEach((row) => {
		buffer.createRow();

		for (let i = 0; i < data.headers.length; i++) {
			const cell = data.cells.find(
				(cell) =>
					cell.rowId === row.id &&
					cell.headerId === data.headers[i].id
			);
			if (cell.type === CONTENT_TYPE.TAG) {
				const tags = data.tags.filter((tag) =>
					tag.selected.includes(cell.id)
				);

				let content = "";

				tags.forEach((tag, j) => {
					if (tag.content === "") return;
					if (j === 0) content += tag.content;
					else content += " " + tag.content;
				});
				buffer.writeColumn(content, columnCharLengths[i]);
			} else {
				buffer.writeColumn(cell.toString(), columnCharLengths[i]);
			}
		}
	});
	return buffer.toString();
};
export class AppDataStringBuffer {
	string: string;

	constructor() {
		this.string = "";
	}

	createRow() {
		if (this.string !== "") this.string += "\n";
		this.string += "|";
	}

	writeColumn(content: string, columnCharLength: number) {
		this.string += " ";
		this.string += content;

		const numWhiteSpace = columnCharLength - content.length;

		//Pads the cell with white space
		for (let i = 0; i < numWhiteSpace; i++) this.string += " ";
		this.string += " ";
		this.string += "|";
	}

	toString() {
		return this.string;
	}
}

interface ColumnCharLengths {
	[columnPosition: number]: number;
}

/**
 * Calculates the max char length for each column.
 * This is used to know how much padding to add to cell.
 * @param headers An array of headers
 * @param cells An array of cells
 * @param tags An array of tags
 * @returns An object containing the calculated lengths
 */
export const calcColumnCharLengths = (data: AppData): ColumnCharLengths => {
	const columnCharLengths: { [columnPosition: number]: number } = [];

	//Check headers
	data.headers.forEach((header, i) => {
		columnCharLengths[i] = header.content.length;
	});

	//Check cells
	data.cells.forEach((cell: Cell) => {
		//We have to do this for the .length function to be available
		if (cell instanceof BaseCell) {
			const index = data.headers.findIndex(
				(header) => header.id === cell.headerId
			);
			if (cell.type === CONTENT_TYPE.TAG) {
				const arr = data.tags.filter((tag) =>
					tag.selected.includes(cell.id)
				);

				let content = "";
				arr.forEach((tag, i) => {
					if (tag.content !== "") {
						if (i === 0) content += tag.content;
						else content += " " + tag.content;
					}
				});
				if (columnCharLengths[index] < content.length)
					columnCharLengths[index] = content.length;
			} else {
				if (columnCharLengths[index] < cell.length())
					columnCharLengths[index] = cell.length();
			}
		}
	});
	return columnCharLengths;
};