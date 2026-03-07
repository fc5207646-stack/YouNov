import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

/** Normalize novel.tags to array (API may return JSON string from DB). */
export function parseTags(tags) {
	if (Array.isArray(tags)) return tags;
	if (typeof tags === 'string') {
		try {
			const parsed = JSON.parse(tags);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
	return [];
}

/** Safe .map: only call map on arrays; never on 0, null, or object. Prevents "0.map is not a function". */
export function safeMap(value, fn) {
	if (value === 0 || value === null || value === undefined) return [];
	if (!Array.isArray(value)) return [];
	return value.map(fn);
}
