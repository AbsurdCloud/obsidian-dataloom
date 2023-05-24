import Menu from "src/react/shared/menu";
import MenuItem from "src/react/shared/menu-item";
import { getDisplayNameForDateFormat } from "src/shared/table-state/display-name";
import { DateFormat } from "src/shared/types/types";
interface Props {
	id: string;
	top: number;
	left: number;
	isOpen: boolean;
	isReady: boolean;
	value: DateFormat;
	onChange: (value: DateFormat) => void;
}

export default function DateFormatMenu({
	id,
	top,
	left,
	isOpen,
	isReady,
	value,
	onChange,
}: Props) {
	//TODO add all formats
	return (
		<Menu
			isOpen={isOpen}
			id={id}
			top={top}
			left={left}
			isReady={isReady}
			width={175}
		>
			<div className="NLT__currency-menu">
				{Object.values([
					DateFormat.DD_MM_YYYY,
					DateFormat.MM_DD_YYYY,
					DateFormat.YYYY_MM_DD,
				]).map((format) => (
					<MenuItem
						key={format}
						name={getDisplayNameForDateFormat(format)}
						isSelected={value === format}
						onClick={() => onChange(format)}
					/>
				))}
			</div>
		</Menu>
	);
}
