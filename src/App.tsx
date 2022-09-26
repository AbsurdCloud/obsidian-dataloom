import React, { useEffect, useMemo, useState } from "react";

import EditableTd from "./components/EditableTd";
import Table from "./components/Table";
import RowMenu from "./components/RowMenu";
import EditableTh from "./components/EditableTh";
import OptionBar from "./components/OptionBar";

import { Cell, CellType } from "./services/table/types";
import { serializeTable } from "./services/io/serialize";
import NltPlugin from "./main";
import { SortDir } from "./services/sort/types";
import { addRow, addColumn } from "./services/internal/add";
import { logFunc } from "./services/debug";
import { DEFAULT_COLUMN_SETTINGS } from "./services/table/types";
import { initialCell } from "./services/io/utils";
import { getUniqueTableId } from "./services/table/utils";
// import { sortRows } from "./services/sort/sort";
import { checkboxToContent, contentToCheckbox } from "./services/table/utils";
import { TableState } from "./services/table/types";

import { DEBUG } from "./constants";

import "./app.css";
import { MarkdownViewModeType } from "obsidian";
import { deserializeTable, markdownToHtml } from "./services/io/deserialize";
import { randomColumnId, randomCellId, randomTagId } from "./services/random";
import { useAppDispatch, useAppSelector } from "./services/redux/hooks";
import {
	closeAllMenus,
	getTopLevelMenu,
	updateMenuPosition,
} from "./services/menu/menuSlice";

import _ from "lodash";
import { getTableSizing } from "./services/table/hooks";

interface Props {
	plugin: NltPlugin;
	tableId: string;
	viewMode: MarkdownViewModeType;
}

const COMPONENT_NAME = "App";

export default function App({ plugin, viewMode, tableId }: Props) {
	const [state, setTableState] = useState<TableState>({
		cacheVersion: -1,
		model: {
			rows: [],
			columns: [],
			cells: [],
		},
		settings: {
			columns: {},
		},
	});

	const [sortTime, setSortTime] = useState(0);
	const [isLoading, setLoading] = useState(true);
	const [saveTime, setSaveTime] = useState({
		time: 0,
		shouldSaveModel: false,
	});

	const dispatch = useAppDispatch();
	const topLevelMenu = useAppSelector((state) => getTopLevelMenu(state));

	const throttleTableScroll = _.throttle(() => {
		if (topLevelMenu) dispatch(closeAllMenus());
		dispatch(updateMenuPosition());
	}, 150);

	const throttlePositionUpdate = _.throttle(() => {
		dispatch(updateMenuPosition());
	}, 150);

	const handleTableScroll = () => throttleTableScroll();

	const handlePositionUpdate = () => throttlePositionUpdate();

	//Load table on mount
	useEffect(() => {
		async function load() {
			const tableState = await deserializeTable(plugin, tableId);
			setTableState(tableState);
			setTimeout(() => {
				setLoading(false);
			}, 300);
		}
		load();
	}, []);

	//We run the throttle save in a useEffect because we want the table model to update
	//with new changes before we save
	useEffect(() => {
		//If not mount
		if (saveTime.time !== 0) {
			throttleSave(saveTime.shouldSaveModel);
		}
	}, [saveTime]);

	const throttleSave = _.throttle(async (shouldSaveModel: boolean) => {
		const viewModesToUpdate: MarkdownViewModeType[] = [];
		if (plugin.isLivePreviewEnabled()) {
			viewModesToUpdate.push(
				viewMode === "source" ? "preview" : "source"
			);
		}
		await serializeTable(
			shouldSaveModel,
			plugin,
			state,
			tableId,
			viewModesToUpdate
		);
	}, 150);

	const handleSaveData = (shouldSaveModel: boolean) =>
		setSaveTime({ shouldSaveModel, time: Date.now() });

	//Handles sync between live preview and reading mode
	useEffect(() => {
		let timer: any = null;

		async function checkForUpdates() {
			const { tableId: tId, viewModes } = plugin.settings.viewModeSync;
			if (tId) {
				const mode = viewModes.find((v) => v === viewMode);
				if (mode && tableId === tId) {
					const modeIndex = viewModes.indexOf(mode);
					plugin.settings.viewModeSync.viewModes.splice(modeIndex, 1);
					if (plugin.settings.viewModeSync.viewModes.length === 0)
						plugin.settings.viewModeSync.tableId = null;
					setTableState(plugin.settings.data[tableId]);
					await plugin.saveSettings();
				}
			}
		}

		function viewModeSync() {
			timer = setInterval(() => {
				checkForUpdates();
			}, 100);
		}

		viewModeSync();
		return () => {
			clearInterval(timer);
		};
	}, []);

	//TODO add
	// useDidMountEffect(() => {
	// 	setTableState((prevState) => {
	// 		return {
	// 			...prevState,
	// 			model: {
	// 				...prevState.model,
	// 				// rows: sortRows(state.model, state.settings),
	// 			},
	// 		};
	// 	});
	// }, [sortTime]);

	//TODO add save

	function sortData() {
		setSortTime(Date.now());
	}

	function handleAddColumn() {
		if (DEBUG.APP) console.log("[App]: handleAddColumn called.");
		setTableState((prevState) => {
			const [model, settings] = addColumn(
				prevState.model,
				prevState.settings
			);
			return {
				...prevState,
				model,
				settings,
			};
		});
		handleSaveData(true);
	}

	function handleAddRow() {
		if (DEBUG.APP) console.log("[App]: handleAddRow called.");
		setTableState((prevState) => {
			const model = addRow(prevState.model);
			return {
				...prevState,
				model: model,
			};
		});
		handleSaveData(true);
	}

	function handleHeaderTypeClick(
		cellId: string,
		columnId: string,
		selectedCellType: CellType
	) {
		if (DEBUG.APP)
			logFunc(COMPONENT_NAME, "handleHeaderTypeClick", {
				cellId,
				columnId,
				selectedCellType,
			});

		function findUpdatedCellContent(type: CellType, content: string) {
			if (type === CellType.CHECKBOX) {
				return checkboxToContent(content);
			} else if (selectedCellType === CellType.CHECKBOX) {
				return contentToCheckbox(content);
			} else {
				return content;
			}
		}

		setTableState((prevState) => {
			const { settings } = prevState;
			const { type } = settings.columns[columnId];

			//If same header type return
			if (type === selectedCellType) return prevState;
			return {
				...prevState,
				model: {
					...prevState.model,
					cells: prevState.model.cells.map((cell: Cell) => {
						if (cell.id === cellId) {
							return {
								...cell,
								markdown: findUpdatedCellContent(
									type,
									cell.markdown
								),
							};
						}
						return cell;
					}),
				},
				settings: {
					...prevState.settings,
					columns: {
						...prevState.settings.columns,
						[columnId]: {
							...prevState.settings.columns[columnId],
							type: selectedCellType,
						},
					},
				},
			};
		});
		handleSaveData(false);
	}

	function handleHeaderSortSelect(columnId: string, sortDir: SortDir) {
		if (DEBUG.APP) {
			logFunc(COMPONENT_NAME, "handleHeaderSortSelect", {
				columnId,
				sortDir,
			});
		}
		setTableState((prevState) => {
			return {
				...prevState,
				settings: {
					...prevState.settings,
					columns: {
						...prevState.settings.columns,
						[columnId]: {
							...prevState.settings.columns[columnId],
							sortDir,
						},
					},
				},
			};
		});
		//TODO add save
		sortData();
	}

	function handleCellContentChange(cellId: string, updatedMarkdown: string) {
		if (DEBUG.APP) {
			logFunc(COMPONENT_NAME, "handleCellContentChange", {
				cellId,
				updatedMarkdown,
			});
		}

		setTableState((prevState) => {
			return {
				...prevState,
				model: {
					...prevState.model,
					cells: prevState.model.cells.map((cell: Cell) => {
						if (cell.id === cellId) {
							return {
								...cell,
								markdown: updatedMarkdown,
								html: markdownToHtml(updatedMarkdown),
							};
						}
						return cell;
					}),
				},
			};
		});
		handleSaveData(true);
		handlePositionUpdate();
	}

	function handleAddTag(
		cellId: string,
		columnId: string,
		markdown: string,
		html: string,
		color: string,
		canAddMultiple: boolean
	) {
		if (DEBUG.APP) {
			logFunc(COMPONENT_NAME, "handleAddTag", {
				cellId,
				markdown,
				html,
				color,
				canAddMultiple,
			});
		}
		setTableState((prevState) => {
			let tags = [...prevState.settings.columns[columnId].tags];

			tags.push({
				id: randomTagId(),
				markdown,
				html,
				color,
				cellIds: [cellId],
			});
			return {
				...prevState,
				model: {
					...prevState.model,
					cells: prevState.model.cells.map((cell) => {
						if (cell.id === cellId) {
							let newMarkdown = cell.markdown;
							if (canAddMultiple && newMarkdown !== "") {
								newMarkdown = newMarkdown + "," + markdown;
							} else {
								newMarkdown = markdown;
							}

							let newHtml = cell.html;
							if (canAddMultiple && newHtml !== "") {
								newHtml = newHtml + "," + html;
							} else {
								newHtml = html;
							}

							return {
								...cell,
								markdown: newMarkdown,
								html: newHtml,
							};
						}
						return cell;
					}),
				},
				settings: {
					...prevState.settings,
					columns: {
						...prevState.settings.columns,
						[columnId]: {
							...prevState.settings.columns[columnId],
							tags,
						},
					},
				},
			};
		});
		handleSaveData(true);
		handlePositionUpdate();
	}

	function handleTagClick(cellId: string, tagId: string) {
		if (DEBUG.APP) {
			logFunc(COMPONENT_NAME, "handleTagClick", {
				cellId,
				tagId,
			});
		}
		//TODO fix
	}

	function handleRemoveTagClick(cellId: string) {
		if (DEBUG.APP) console.log("[App]: handleRemoveTagClick called.");
		//TODO fix
		// setTableModel((prevState) => {
		// 	return {
		// 		...prevState,
		// 		tags: removeTagReferences(prevState.tags, cellId),
		// 	};
		// });
	}

	function handleHeaderDeleteClick(columnId: string) {
		if (DEBUG.APP)
			logFunc(COMPONENT_NAME, "handleHeaderDeleteClick", {
				columnId,
			});

		setTableState((prevState) => {
			const obj = { ...prevState.settings.columns };
			delete obj[columnId];

			return {
				...prevState,
				model: {
					...prevState.model,
					columns: prevState.model.columns.filter(
						(column) => column !== columnId
					),
					cells: cells.filter((cell) => cell.columnId !== columnId),
				},
				settings: {
					...prevState.settings,
					columns: obj,
				},
			};
		});
		handleSaveData(true);
		handlePositionUpdate();
		//sortData();
	}

	function handleRowDeleteClick(rowId: string) {
		if (DEBUG.APP)
			logFunc(COMPONENT_NAME, "handleRowDeleteClick", {
				rowId,
			});
		setTableState((prevState) => {
			return {
				...prevState,
				model: {
					...prevState.model,
					cells: prevState.model.cells.filter(
						(cell) => cell.rowId !== rowId
					),
					rows: prevState.model.rows.filter((id) => id !== rowId),
				},
			};
		});
		handleSaveData(true);
		handlePositionUpdate();
		//sortData();
	}

	function handleHeaderWidthChange(columnId: string, width: string) {
		if (DEBUG.APP) {
			logFunc(COMPONENT_NAME, "handleHeaderWidthChange", {
				columnId,
				width,
			});
		}
		setTableState((prevState) => {
			return {
				...prevState,
				settings: {
					...prevState.settings,
					columns: {
						...prevState.settings.columns,
						[columnId]: {
							...prevState.settings.columns[columnId],
							width,
						},
					},
				},
			};
		});
		handleSaveData(false);
		handlePositionUpdate();
		dispatch(closeAllMenus());
	}

	function handleMoveColumnClick(columnId: string, moveRight: boolean) {
		if (DEBUG.APP)
			logFunc(COMPONENT_NAME, "handleMoveColumnClick", {
				columnId,
				moveRight,
			});
		setTableState((prevState: TableState) => {
			const { model } = prevState;
			const columnArr = [...model.columns];
			const index = columnArr.indexOf(columnId);
			const moveIndex = moveRight ? index + 1 : index - 1;

			//Swap values
			const old = columnArr[moveIndex];
			columnArr[moveIndex] = columnArr[index];
			columnArr[index] = old;

			console.log({
				...prevState,
				model: {
					...model,
					columns: columnArr,
				},
			});
			return {
				...prevState,
				model: {
					...model,
					columns: columnArr,
				},
			};
		});
		handleSaveData(true);
	}

	function handleInsertColumnClick(columnId: string, insertRight: boolean) {
		if (DEBUG.APP)
			logFunc(COMPONENT_NAME, "handleInsertColumnClick", {
				columnId,
				insertRight,
			});
		setTableState((prevState: TableState) => {
			const { model, settings } = prevState;
			const index = prevState.model.columns.indexOf(columnId);
			const insertIndex = insertRight ? index + 1 : index;

			const newColId = randomColumnId();

			const cellArr = [...model.cells];

			for (let i = 0; i < model.rows.length; i++) {
				let markdown = "";
				let html = "";
				if (i === 0) {
					markdown = "New Column";
					html = "New Column";
				}

				cellArr.push(
					initialCell(
						randomCellId(),
						newColId,
						model.rows[i],
						markdown,
						html
					)
				);
			}

			const columnArr = [...model.columns];
			columnArr.splice(insertIndex, 0, newColId);

			const settingsObj = { ...settings };
			settingsObj.columns[newColId] = DEFAULT_COLUMN_SETTINGS;

			console.log({
				...prevState,
				model: {
					...model,
					columns: columnArr,
					cells: cellArr,
				},
				settings: settingsObj,
			});
			return {
				...prevState,
				model: {
					...model,
					columns: columnArr,
					cells: cellArr,
				},
				settings: settingsObj,
			};
		});
		handleSaveData(true);
	}

	function handleChangeColor(tagId: string, color: string) {
		//TODO edit
		// setTableModel((prevState) => {
		// 	return {
		// 		...prevState,
		// 		tags: prevState.tags.map((tag) => {
		// 			if (tag.id === tagId) {
		// 				return {
		// 					...tag,
		// 					color,
		// 				};
		// 			}
		// 			return tag;
		// 		}),
		// 	};
		// });
		handleSaveData(false);
	}

	function handleAutoWidthToggle(columnId: string, value: boolean) {
		if (DEBUG.APP)
			logFunc(COMPONENT_NAME, "handleAutoWidthToggle", {
				columnId,
				value,
			});
		setTableState((prevState) => {
			return {
				...prevState,
				settings: {
					...prevState.settings,
					columns: {
						...prevState.settings.columns,
						[columnId]: {
							...prevState.settings.columns[columnId],
							useAutoWidth: value,
						},
					},
				},
			};
		});
		handleSaveData(false);
		handlePositionUpdate();
	}

	function handleWrapContentToggle(columnId: string, value: boolean) {
		if (DEBUG.APP)
			logFunc(COMPONENT_NAME, "handleWrapContentToggle", {
				columnId,
				value,
			});
		setTableState((prevState) => {
			return {
				...prevState,
				settings: {
					...prevState.settings,
					columns: {
						...prevState.settings.columns,
						[columnId]: {
							...prevState.settings.columns[columnId],
							shouldWrapOverflow: value,
						},
					},
				},
			};
		});
		handleSaveData(false);
		handlePositionUpdate();
	}

	const findCellWidth = (
		columnType: string,
		useAutoWidth: boolean,
		calculatedWidth: string,
		width: string
	) => {
		if (columnType !== CellType.TEXT && columnType !== CellType.NUMBER)
			return width;
		if (useAutoWidth) return calculatedWidth;
		return width;
	};

	const { columnWidths, rowHeights } = useMemo(() => {
		return getTableSizing(state);
	}, [state.model.cells, state.settings.columns]);

	if (isLoading) return <div>Loading table...</div>;

	const { rows, columns, cells } = state.model;
	const tableIdWithMode = getUniqueTableId(tableId, viewMode);

	return (
		<div
			id={tableIdWithMode}
			data-id={tableId}
			className="NLT__app"
			tabIndex={0}
		>
			<OptionBar model={state.model} settings={state.settings} />
			<div className="NLT__table-wrapper" onScroll={handleTableScroll}>
				<Table
					headers={columns.map((columnId, i) => {
						const {
							width,
							type,
							sortDir,
							shouldWrapOverflow,
							useAutoWidth,
						} = state.settings.columns[columnId];

						const cell = cells.find(
							(c) =>
								c.rowId === rows[0] && c.columnId === columnId
						);
						const { id, markdown, html } = cell;
						return {
							id,
							component: (
								<EditableTh
									key={id}
									cellId={id}
									columnIndex={i}
									numColumns={columns.length}
									columnId={cell.columnId}
									width={findCellWidth(
										type,
										useAutoWidth,
										columnWidths[cell.columnId],
										width
									)}
									shouldWrapOverflow={shouldWrapOverflow}
									useAutoWidth={useAutoWidth}
									markdown={markdown}
									html={html}
									type={type}
									sortDir={sortDir}
									onSortSelect={handleHeaderSortSelect}
									onInsertColumnClick={
										handleInsertColumnClick
									}
									onMoveColumnClick={handleMoveColumnClick}
									onWidthChange={handleHeaderWidthChange}
									onDeleteClick={handleHeaderDeleteClick}
									onSaveClick={handleCellContentChange}
									onTypeSelect={handleHeaderTypeClick}
									onAutoWidthToggle={handleAutoWidthToggle}
									onWrapOverflowToggle={
										handleWrapContentToggle
									}
								/>
							),
						};
					})}
					rows={rows
						.filter((_row, i) => i !== 0)
						.map((rowId) => {
							const rowCells = cells.filter(
								(cell) => cell.rowId === rowId
							);
							return {
								id: rowId,
								component: (
									<>
										{rowCells.map((cell, i) => {
											const {
												width,
												type,
												useAutoWidth,
												shouldWrapOverflow,
												tags,
											} =
												state.settings.columns[
													cell.columnId
												];

											const { id, markdown, html } = cell;

											return (
												<EditableTd
													key={id}
													cellId={id}
													tags={tags}
													columnId={cell.columnId}
													markdown={markdown}
													html={html}
													columnType={type}
													shouldWrapOverflow={
														shouldWrapOverflow
													}
													useAutoWidth={useAutoWidth}
													width={findCellWidth(
														type,
														useAutoWidth,
														columnWidths[
															cell.columnId
														],
														width
													)}
													height={rowHeights[rowId]}
													onTagClick={handleTagClick}
													onRemoveTagClick={
														handleRemoveTagClick
													}
													onContentChange={
														handleCellContentChange
													}
													onColorChange={
														handleChangeColor
													}
													onAddTag={handleAddTag}
												/>
											);
										})}
										<td
											className="NLT__td"
											style={{
												height: rowHeights[rowId],
											}}
										>
											<div className="NLT__td-container">
												<RowMenu
													rowId={rowId}
													onDeleteClick={
														handleRowDeleteClick
													}
												/>
											</div>
										</td>
									</>
								),
							};
						})}
					onAddColumn={handleAddColumn}
					onAddRow={handleAddRow}
				/>
			</div>
		</div>
	);
}
