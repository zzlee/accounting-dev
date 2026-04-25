export const formatDateToYYYYMMDD = (date: Date): string => {
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const day = date.getDate().toString().padStart(2, '0');
	return `${year}-${month}-${day}`;
};

export const parseYYYYMMDDToLocalDate = (value: string): Date => {
	if (!value) return new Date();
	const [year, month, day] = value.split('-').map(Number);
	if (!year || !month || !day) {
		return new Date(value);
	}
	return new Date(year, month - 1, day);
};

export const formatDateForDisplay = (value: string, locale = 'zh-TW'): string => {
	return new Intl.DateTimeFormat(locale).format(parseYYYYMMDDToLocalDate(value));
};
