import {useState} from "react";

export function useAsyncState<T>(initialValue: T): [T, (v: T) => Promise<void>] {
    const [value, setValue] = useState<T>(initialValue);
    const setter = (x: T) =>
        new Promise<void>(resolve => {
            setValue(x);
            resolve();
        });
    return [value, setter];
}