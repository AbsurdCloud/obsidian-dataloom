import React from "react";

import { useCompare, useInputSelection } from "src/shared/hooks";
import { useOverflow } from "src/shared/spacing/hooks";

import { useMenu } from "src/shared/menu/hooks";
import { useMenuTriggerPosition, useShiftMenu } from "src/shared/menu/utils";
import { MenuCloseRequest, MenuLevel } from "src/shared/menu/types";
import SuggestMenu from "../../shared/suggest-menu/suggest-menu";
import {
	addClosingBracket,
	doubleBracketsInnerReplace,
	getFilterValue,
	isSurroundedByDoubleBrackets,
	removeClosingBracket,
} from "../../shared/suggest-menu/utils";

import { getWikiLinkText } from "src/shared/link/link-utils";
import { css } from "@emotion/react";
import { textAreaStyle } from "src/react/table-app/shared-styles";
import { VaultFile } from "src/obsidian-shim/development/vault-file";
import { useLogger } from "src/shared/logger";

interface Props {
	menuCloseRequest: MenuCloseRequest | null;
	value: string;
	shouldWrapOverflow: boolean;
	onChange: (value: string) => void;
	onMenuClose: () => void;
}

export default function TextCellEdit({
	shouldWrapOverflow,
	menuCloseRequest,
	value,
	onChange,
	onMenuClose,
}: Props) {
	const { menu, isMenuOpen, menuRef, openMenu, closeAllMenus, closeTopMenu } =
		useMenu(MenuLevel.TWO);
	const { triggerRef, triggerPosition } = useMenuTriggerPosition();
	useShiftMenu(triggerRef, menuRef, isMenuOpen, {
		topOffset: 35,
	});

	const [localValue, setLocalValue] = React.useState(value);
	const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
	const { setPreviousSelectionStart, previousSelectionStart } =
		useInputSelection(inputRef, localValue);

	const logger = useLogger();

	const previousValue = React.useRef("");

	const hasCloseRequestTimeChanged = useCompare(
		menuCloseRequest?.requestTime
	);

	React.useEffect(() => {
		if (hasCloseRequestTimeChanged && menuCloseRequest !== null) {
			console.log("HERE");
			if (localValue !== value) onChange(localValue);
			onMenuClose();
		}
	}, [
		value,
		localValue,
		hasCloseRequestTimeChanged,
		menuCloseRequest,
		onMenuClose,
		onChange,
	]);

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		const el = e.target as HTMLTextAreaElement;
		logger("TextCellEdit handleKeyDown");

		if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
			const cursorPosition = el.selectionStart;

			if (isMenuOpen) {
				//Close menu if cursor is outside of double brackets
				if (!isSurroundedByDoubleBrackets(value, cursorPosition))
					closeTopMenu();
			}

			//Update cursor position for filterValue calculation
			setPreviousSelectionStart(cursorPosition);
		}
	}

	function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		const inputValue = e.target.value;
		let newValue = inputValue;

		if (inputRef.current) {
			const inputEl = inputRef.current;

			if (inputValue.length > localValue.length) {
				newValue = addClosingBracket(newValue, inputEl.selectionStart);
			} else {
				newValue = removeClosingBracket(
					localValue,
					inputValue,
					inputEl.selectionStart
				);
			}

			if (
				isSurroundedByDoubleBrackets(newValue, inputEl.selectionStart)
			) {
				if (!isMenuOpen) openMenu(menu);
			}

			if (inputEl.selectionStart)
				setPreviousSelectionStart(inputEl.selectionStart);
		}

		previousValue.current = newValue;
		setLocalValue(newValue);
	}

	function handleSuggestItemClick(
		file: VaultFile | null,
		isFileNameUnique: boolean
	) {
		if (file) {
			const fileName = getWikiLinkText(file, isFileNameUnique);

			const newValue = doubleBracketsInnerReplace(
				localValue,
				previousSelectionStart,
				fileName
			);

			onChange(newValue);
		}
		closeAllMenus();
	}

	const overflowStyle = useOverflow(shouldWrapOverflow);
	const filterValue =
		getFilterValue(localValue, previousSelectionStart) ?? "";

	return (
		<>
			<div
				className="NLT__text-cell-edit"
				ref={triggerRef}
				css={css`
					width: 100%;
					height: 100%;
				`}
			>
				<textarea
					autoFocus
					css={css`
						${textAreaStyle}
						${overflowStyle}
					`}
					ref={inputRef}
					value={localValue}
					onKeyDown={handleKeyDown}
					onChange={handleTextareaChange}
					onBlur={(e) => {
						e.target.classList.add("NLT__blur--cell");
					}}
				/>
			</div>
			<SuggestMenu
				id={menu.id}
				ref={menuRef}
				isOpen={isMenuOpen}
				top={triggerPosition.top}
				left={triggerPosition.left}
				filterValue={filterValue}
				onItemClick={handleSuggestItemClick}
			/>
		</>
	);
}
