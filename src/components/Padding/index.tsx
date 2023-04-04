import { getSpacing } from "src/services/spacing";
import { SpacingSize } from "src/services/spacing/types";

interface Props {
	className?: string;
	paddingX?: SpacingSize;
	paddingY?: SpacingSize;
	padding?: SpacingSize;
	children: React.ReactNode;
}

export default function Padding({
	className = "",
	paddingX,
	paddingY,
	padding,
	children,
}: Props) {
	let style: Record<string, any> = {
		width: "100%",
	};

	if (padding) {
		style = { ...style, padding: getSpacing(padding) };
	} else {
		if (paddingX) {
			const spacingX = getSpacing(paddingX);
			style = { ...style, paddingLeft: spacingX, paddingRight: spacingX };
		}
		if (paddingY) {
			const spacingY = getSpacing(paddingY);
			style = {
				...style,
				paddingTop: spacingY,
				paddingBottom: spacingY,
			};
		}
	}

	return (
		<div style={style} className={className}>
			{children}
		</div>
	);
}