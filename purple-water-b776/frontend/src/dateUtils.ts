const formatTwoDigits = (value: number): string => value.toString().padStart(2, '0');

const toLocalDateTimeInputValue = (date: Date): string => {
	const year = date.getFullYear();
	const month = formatTwoDigits(date.getMonth() + 1);
	const day = formatTwoDigits(date.getDate());
	const hours = formatTwoDigits(date.getHours());
	const minutes = formatTwoDigits(date.getMinutes());
	return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const parseDate = (value: string): Date | null => {
	if (!value) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}
	return parsed;
};

export const getDefaultTransactionLocalDateTime = (): string => toLocalDateTimeInputValue(new Date());

export const utcToLocalDateTimeInputValue = (value: string): string => {
	const parsed = parseDate(value);
	if (!parsed) {
		return getDefaultTransactionLocalDateTime();
	}
	return toLocalDateTimeInputValue(parsed);
};

export const localDateTimeInputToUtcIso = (value: string): string | null => {
	const parsed = parseDate(value);
	if (!parsed) {
		return null;
	}
	return parsed.toISOString();
};

export const formatDateForDisplay = (value: string, locale = 'zh-TW'): string => {
	const parsed = parseDate(value);
	if (!parsed) {
		return value;
	}
	return new Intl.DateTimeFormat(locale, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).format(parsed);
};

export const getTransactionMonthUtcRange = (date: Date): { startDate: string; endDate: string } => {
	const startLocal = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
	const nextMonthStartLocal = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
	const endLocal = new Date(nextMonthStartLocal.getTime() - 1);

	return {
		startDate: startLocal.toISOString(),
		endDate: endLocal.toISOString(),
	};
};

export const getTransactionDateTimestamp = (value: string): number => {
	const parsed = parseDate(value);
	if (!parsed) {
		return 0;
	}
	return parsed.getTime();
};
