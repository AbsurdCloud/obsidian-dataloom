import { RootState } from "../redux/store";
import { Position } from "./types";

export const isMenuOpen = (state: RootState, menuId: string) =>
	state.menu.openMenus.find((menu) => menu.id === menuId) != null;

export const getCloseMenuRequestTime = (state: RootState, menuId: string) => {
	if (state.menu.menuRequestingClose?.id === menuId) {
		return state.menu.menuRequestingClose.requestTime;
	}
	return null;
};

export const isTopLevelMenu = (state: RootState, menuId: string) =>
	state.menu.openMenus.last()?.id === menuId;

export const getElementPosition = (el: HTMLElement | null): Position => {
	if (el) {
		const { top, left } = el.getBoundingClientRect();
		//We use offsetWidth, and offsetHeight instead of the width and height of the rectangle
		//because we want whole values to match what we set as the column width.
		//This will make sure that the rendered cell and the input cell are the same size
		const { offsetWidth, offsetHeight } = el;

		//Set position to the current position of the cell
		return {
			width: offsetWidth,
			height: offsetHeight,
			top,
			left,
		};
	}
	return {
		top: 0,
		left: 0,
		width: 0,
		height: 0,
	};
};

export const shiftMenuIntoViewContent = (
	menuId: string,
	menuPositionEl: HTMLElement | null,
	menuPosition: Position,
	topOffset: number,
	leftOffset: number
) => {
	//The menuPositionEl will be null on first render since the element is not in the DOM yet
	if (menuPositionEl !== null) {
		//Now we want to make sure that this is within bounds
		const viewContentEl = menuPositionEl.closest(
			".view-content"
		) as HTMLElement;

		const containerPosition = getElementPosition(viewContentEl);

		let menuElWidth = menuPosition.width;
		let menuElHeight = menuPosition.height;

		//The menu position contains the position of the menu container, not the menu itself
		//This means that the top and left values of the menu will match the menu container,
		//but the width and height may be different, depending on if the menu is set to `max-content`
		//Therefore we need to get those values from the menu itself
		const menu = document.body.querySelector(
			`#${menuId}`
		) as HTMLElement | null;

		if (menu) {
			const menuContainerEl = menu.firstChild as HTMLElement;
			const { offsetWidth, offsetHeight } = menuContainerEl;
			menuElWidth = offsetWidth;
			menuElHeight = offsetHeight;

			//It takes 2 renders to calculate the correct position for the menu.
			//When you first open the menu, the menu container is set to the width and height of the menuPositionRef.
			//The menu, however, can have a width or height greater than this if `maxContent` is set.
			//Therefore we render the menu with visibility set to hidden. Then we use the useForceUpdate hook to force a re-render.
			//The menu is now available in the DOM and we can progamatically get the width and height of the menu to
			//shift it into the view container.
			menuContainerEl.toggleVisibility(true);
		}

		return moveElementIntoContainer(containerPosition, {
			top: menuPosition.top + topOffset,
			left: menuPosition.left + leftOffset,
			width: menuElWidth,
			height: menuElHeight,
		});
	}
	return menuPosition;
};

const moveElementIntoContainer = (
	containerPosition: Position,
	elementPosition: Position
): Position => {
	// Check if elementPosition is already inside containerPosition
	if (
		elementPosition.top >= containerPosition.top &&
		elementPosition.left >= containerPosition.left &&
		elementPosition.top + elementPosition.height <=
			containerPosition.top + containerPosition.height &&
		elementPosition.left + elementPosition.width <=
			containerPosition.left + containerPosition.width
	) {
		return elementPosition;
	}

	// Shift up if the element is below
	if (
		elementPosition.top + elementPosition.height >
		containerPosition.top + containerPosition.height
	) {
		elementPosition.top =
			containerPosition.top +
			containerPosition.height -
			elementPosition.height;
	}

	// Shift left if the element is to the right
	if (
		elementPosition.left + elementPosition.width >
		containerPosition.left + containerPosition.width
	) {
		elementPosition.left =
			containerPosition.left +
			containerPosition.width -
			elementPosition.width;
	}

	//Shift down if the element is above
	if (elementPosition.top < containerPosition.top) {
		elementPosition.top = containerPosition.top;
	}

	//Shift right if the element is to the left
	if (elementPosition.left < containerPosition.left) {
		elementPosition.left = containerPosition.left;
	}
	return elementPosition;
};