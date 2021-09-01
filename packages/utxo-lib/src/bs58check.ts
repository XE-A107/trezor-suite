import { bitcoin as BITCOIN_NETWORK, isNetworkType } from './networks';
import * as bs58 from 'bs58';
import * as bs58check from 'bs58check';
import { blake256 } from './crypto';

export function decodeBlake(buffer: Buffer) {
    const want = buffer.slice(-4);
    const payload = buffer.slice(0, -4);
    const got = blake256(blake256(payload)).slice(0, 4);

    if ((want[0] ^ got[0]) | (want[1] ^ got[1]) | (want[2] ^ got[2]) | (want[3] ^ got[3]))
        throw new Error('invalid checksum');

    return payload;
}

export function decodeBlake256Key(key: string) {
    const buffer = bs58.decode(key);
    return decodeBlake(buffer);
}

export function decodeBlake256(address: string) {
    const buffer = bs58.decode(address);
    if (buffer.length !== 26) throw new Error(`${address} invalid address length`);
    let payload;
    try {
        payload = decodeBlake(buffer);
    } catch (e) {
        throw new Error(`${address} ${e.message}`);
    }
    return payload;
}

export function encodeBlake256(payload: Buffer) {
    const checksum = blake256(blake256(payload)).slice(0, 4);
    return bs58.encode(Buffer.concat([payload, checksum]));
}

export function encode(payload: Buffer, network = BITCOIN_NETWORK) {
    return isNetworkType('decred', network) ? encodeBlake256(payload) : bs58check.encode(payload);
}

export function decode(payload: string, network = BITCOIN_NETWORK) {
    return isNetworkType('decred', network) ? decodeBlake256(payload) : bs58check.decode(payload);
}

export function encodeMultibytePayload(hash: Buffer, version: number, network = BITCOIN_NETWORK) {
    // Zcash and Decred add an extra prefix resulting in a bigger (22 bytes) payload.
    // Identify them by checking if the version is multibyte (2 bytes instead of 1)
    const multibyte = version > 0xff;
    const size = multibyte ? 22 : 21;
    const offset = multibyte ? 2 : 1;

    const payload = Buffer.allocUnsafe(size);
    if (multibyte) {
        payload.writeUInt16BE(version, 0);
    } else {
        payload.writeUInt8(version, 0);
    }

    hash.copy(payload, offset);

    return encode(payload, network);
}
