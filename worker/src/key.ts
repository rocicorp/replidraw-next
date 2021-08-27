export function key(...parts: string[]): string {
    return parts.join('/');
}

export function usrKey(...parts: string[]): string {
    return key('usr', ...parts);
}

export function sysKey(...parts: string[]): string {
    return key('sys', ...parts);
}

export function idxKey(...parts: string[]): string {
    return key('idx', ...parts);
}
