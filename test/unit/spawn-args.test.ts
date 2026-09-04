import { quoteWindowsArg } from '#spawn-args';
import { describe, expect, it } from 'vitest';

describe('quoteWindowsArg', () => {
	it('leaves plain args alone and quotes the rest', () => {
		expect(quoteWindowsArg('abc')).toBe('abc');
		expect(quoteWindowsArg('')).toBe('""');
		expect(quoteWindowsArg('a b')).toBe('"a b"');
		expect(quoteWindowsArg('say "hi"')).toBe('"say \\"hi\\""');
		expect(quoteWindowsArg('C:\\dir with space\\')).toBe('"C:\\dir with space\\\\"');
	});
});
