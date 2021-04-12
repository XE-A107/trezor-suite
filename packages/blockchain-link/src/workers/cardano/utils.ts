import BigNumber from 'bignumber.js';
import {
    BlockfrostUtxos,
    BlockfrostTransaction,
    BlockfrostAccountInfo,
    ParseAssetResult,
} from '../../types/cardano';
import { Utxo } from '../../types/responses';
import EmurgoCip from '@emurgo/cip14-js';
import { VinVout } from '../../types/blockbook';
import {
    Transaction,
    AccountInfo,
    AccountAddresses,
    TokenInfo,
    TokenTransfer,
} from '../../types/common';
import { filterTargets, sumVinVout } from '../utils';

export const transformUtxos = (utxos: BlockfrostUtxos[]): Utxo[] => {
    const result: Utxo[] = [];

    utxos.forEach(utxo => {
        const lovelaceBalance = utxo.utxoData.amount.find(b => b.unit === 'lovelace');
        if (!lovelaceBalance) return;

        result.push({
            address: utxo.address,
            txid: utxo.utxoData.tx_hash,
            confirmations: utxo.blockInfo.confirmations,
            blockHeight: utxo.blockInfo.height || 0,
            amount: lovelaceBalance?.quantity || '0',
            vout: utxo.utxoData.output_index,
            path: utxo.path,
        });
    });

    return result;
};

const hexToString = (input: string): string => {
    const hex = input.toString();
    let str = '';
    for (let n = 0; n < hex.length; n += 2) {
        str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }

    return str;
};

export const getFingerprint = (policyId: string, assetName?: string): string =>
    new EmurgoCip(
        Uint8Array.from(Buffer.from(policyId, 'hex')),
        Uint8Array.from(Buffer.from(assetName || '', 'hex'))
    ).fingerprint();

export const parseAsset = (hex: string): ParseAssetResult => {
    const policyIdSize = 56;
    const policyId = hex.slice(0, policyIdSize);
    const assetNameInHex = hex.slice(policyIdSize);
    const assetName = hexToString(assetNameInHex);
    const fingerprint = getFingerprint(policyId, assetNameInHex);

    return {
        policyId,
        assetName,
        fingerprint,
    };
};

export const transformTokenInfo = (
    tokens: BlockfrostAccountInfo['tokens']
): TokenInfo[] | undefined => {
    if (!tokens || !Array.isArray(tokens)) return undefined;
    const info = tokens.map(t => {
        const { fingerprint, assetName } = parseAsset(t.unit);
        return {
            type: 'CARDANO',
            name: fingerprint,
            address: fingerprint,
            symbol: assetName,
            balance: t.quantity,
            decimals: t.decimals,
        };
    });

    return info.length > 0 ? info : undefined;
};

export const transformInputOutput = (
    data: BlockfrostTransaction['txUtxos']['inputs'] | BlockfrostTransaction['txUtxos']['outputs'],
    asset = 'lovelace'
): VinVout[] =>
    data.map((utxo, i) => ({
        n: i,
        addresses: [utxo.address],
        isAddress: true,
        value: utxo.amount.find(a => a.unit === asset)?.quantity ?? '0',
    }));

export const filterTokenTransfers = (
    accountAddress: AccountAddresses,
    tx: BlockfrostTransaction,
    type: Transaction['type']
): TokenTransfer[] => {
    const myAddresses = accountAddress.change.concat(accountAddress.used, accountAddress.unused);
    const tokens = Array.from(
        new Set(
            tx.txData.output_amount
                .filter(asset => asset.unit !== 'lovelace')
                .map(asset => asset.unit)
        )
    );

    const transfers = tokens.map(token => {
        const inputs = transformInputOutput(tx.txUtxos.inputs, token);
        const outputs = transformInputOutput(tx.txUtxos.outputs, token);
        const outgoing = filterTargets(myAddresses, inputs);
        const incoming = filterTargets(myAddresses, outputs);
        if (incoming.length === 0 && outgoing.length === 0) return null;

        let amount = '0';
        // const internal = accountAddress ? filterTargets(accountAddress.change, outputs) : [];
        if (type === 'sent') {
            const myInputsSum = sumVinVout(outgoing, '0');
            // reduce sum by my outputs values
            amount = sumVinVout(incoming, myInputsSum, 'reduce');
        } else if (type === 'recv') {
            if (incoming.length > 0) {
                amount = sumVinVout(incoming, '0');
            }
        }

        if (amount === '0') return null;

        const { fingerprint, assetName } = parseAsset(token);
        return {
            type,
            name: assetName,
            symbol: assetName,
            address: fingerprint,
            decimals: 0,
            amount: amount.toString(),
            from:
                type === 'sent' || type === 'self'
                    ? tx.address
                    : tx.txUtxos.inputs.find(i => i.amount.find(a => a.unit === token))?.address,
            to:
                type === 'recv'
                    ? tx.address
                    : tx.txUtxos.outputs.find(i => i.amount.find(a => a.unit === token))?.address,
        };
    });

    return transfers.filter(t => !!t) as TokenTransfer[];
};

export const transformTransaction = (
    descriptor: string,
    accountAddress: AccountAddresses | undefined,
    blockfrostTxData: BlockfrostTransaction
): Transaction => {
    const myAddresses = accountAddress
        ? accountAddress.change.concat(accountAddress.used, accountAddress.unused)
        : [descriptor];

    let type: Transaction['type'];
    let targets: VinVout[] = [];
    let amount =
        blockfrostTxData.txData.output_amount.find(b => b.unit === 'lovelace')?.quantity || '0';
    const fee = blockfrostTxData.txData.fees;
    let totalSpent = new BigNumber(amount || '0').plus(fee).toString();
    const inputs = transformInputOutput(blockfrostTxData.txUtxos.inputs);
    const outputs = transformInputOutput(blockfrostTxData.txUtxos.outputs);
    const vinLength = Array.isArray(inputs) ? inputs.length : 0;
    const voutLength = Array.isArray(outputs) ? outputs.length : 0;
    const outgoing = filterTargets(myAddresses, inputs);
    const incoming = filterTargets(myAddresses, outputs);
    const internal = accountAddress ? filterTargets(accountAddress.change, outputs) : [];
    const totalInput = sumVinVout(vinLength ? inputs : []);
    const totalOutput = sumVinVout(voutLength ? outputs : []);

    if (outgoing.length === 0 && incoming.length === 0) {
        type = 'unknown';
    } else if (
        vinLength > 0 &&
        voutLength > 0 &&
        outgoing.length === vinLength &&
        incoming.length === voutLength
    ) {
        // all inputs and outputs are mine
        type = 'self';
        targets = outputs.filter(o => internal.indexOf(o) < 0);
        // recalculate amount, amount spent is just a fee
        amount = blockfrostTxData.txData.fees;
        totalSpent = amount;
    } else if (outgoing.length === 0 && incoming.length > 0) {
        // none of the input is mine but and output or token transfer is mine
        type = 'recv';
        amount = '0';
        if (incoming.length > 0) {
            targets = incoming;
            // recalculate amount, sum all incoming vout
            amount = sumVinVout(incoming, amount);
            totalSpent = amount;
        }
    } else {
        type = 'sent';
        targets = outputs.filter(o => internal.indexOf(o) < 0);
        // regular targets
        if (voutLength) {
            // bitcoin-like transaction
            // sum all my inputs
            const myInputsSum = sumVinVout(outgoing, '0');
            // reduce sum by my outputs values
            totalSpent = sumVinVout(incoming, myInputsSum, 'reduce');
            amount = new BigNumber(totalSpent).minus(fee ?? '0').toString();
        }
    }

    const tokens = accountAddress
        ? filterTokenTransfers(accountAddress, blockfrostTxData, type)
        : [];

    return {
        type,
        txid: blockfrostTxData.txHash,
        blockTime: blockfrostTxData.blockInfo.time,
        blockHeight: blockfrostTxData.blockInfo.height || undefined,
        blockHash: blockfrostTxData.blockInfo.hash,
        amount,
        fee,
        totalSpent,
        targets,
        tokens,
        details: {
            vin: inputs,
            vout: outputs,
            size: blockfrostTxData.txData.size,
            totalInput: totalInput ? totalInput.toString() : '0',
            totalOutput: totalOutput ? totalOutput.toString() : '0',
        },
    };
};

export const transformAccountInfo = (info: BlockfrostAccountInfo): AccountInfo => {
    const cardanoTxs = info.history.transactions;

    const result = {
        ...info,
        tokens: transformTokenInfo(info.tokens),
        history: {
            ...info.history,
            transactions: !cardanoTxs
                ? []
                : cardanoTxs?.map(tx => transformTransaction(info.descriptor, info.addresses, tx)),
        },
    };

    return result;
};
