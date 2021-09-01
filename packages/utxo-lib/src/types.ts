import * as typeforce from 'typeforce';

export type StackElement = Buffer | number;
export type Stack = StackElement[];
export type StackFunction = () => Stack;

const SATOSHI_MAX = 21 * 1e14;
export function Satoshi(value: number) {
    return typeforce.UInt53(value) && value <= SATOSHI_MAX;
}

export const Buffer256bit = typeforce.BufferN(32);
export const Hash160bit = typeforce.BufferN(20);
export const Hash256bit = typeforce.BufferN(32);
export const {
    Number,
    Array,
    Boolean,
    String,
    Buffer,
    Hex,
    maybe,
    tuple,
    UInt8,
    UInt16,
    UInt32,
    Function,
    BufferN,
    Nil,
    anyOf,
} = typeforce;
