import { Transaction } from '../src/transaction';
import * as NETWORKS from '../src/networks';
import * as utils from './transaction.utils';
import fixturesBitcoin from './__fixtures__/transaction/bitcoin';
import fixturesDash from './__fixtures__/transaction/dash';
import fixturesDecred from './__fixtures__/transaction/decred';
import fixturesDoge from './__fixtures__/transaction/doge';
import fixturesKomodo from './__fixtures__/transaction/komodo';
import fixturesPeercoin from './__fixtures__/transaction/peercoin';
import fixturesZcash from './__fixtures__/transaction/zcash';

describe('Transaction', () => {
    describe('import fromBuffer/fromHex', () => {
        // common function for multiple fixtures
        const importExport = (f: any) => {
            it(`${f.description} (${f.hash})`, () => {
                const tx = Transaction.fromHex(f.hex, { network: utils.getNetwork(f.network) });
                utils.checkTx(tx, f.raw);
                expect(tx.toHex()).toEqual(f.hex);
            });

            if (f.whex) {
                it(`${f.description} (${f.hash}) as witness`, () => {
                    const tx = Transaction.fromHex(f.whex);
                    utils.checkTx(tx, f.raw);
                    expect(tx.toHex()).toEqual(f.whex);
                });
            }
        };

        fixturesBitcoin.valid.forEach(importExport);

        fixturesDash.valid.forEach(importExport);

        fixturesDoge.valid.forEach(importExport);

        fixturesKomodo.valid.forEach(importExport);

        fixturesPeercoin.valid.forEach(importExport);

        // Decred requires special check
        fixturesDecred.valid.forEach(f => {
            it(f.description, () => {
                const tx = Transaction.fromHex(f.hex, { network: utils.getNetwork(f.network) });

                expect(tx.version).toEqual(f.raw.version);
                expect(tx.type).toEqual(f.raw.type);
                expect(tx.ins.length).toEqual(f.raw.ins.length);
                expect(tx.outs.length).toEqual(f.raw.outs.length);
                expect(tx.locktime).toEqual(f.raw.locktime);
                expect(tx.expiry).toEqual(f.raw.expiry);
                tx.ins.forEach((input, i) => {
                    const expected: any = f.raw.ins[i];
                    expect(input.hash.toString('hex')).toEqual(expected.hash);
                    expect(input.index).toEqual(expected.index);
                    expect(input.decredTree).toEqual(expected.tree);
                    expect(input.sequence).toEqual(expected.sequence);
                    if (tx.hasWitnesses() && input.decredWitness) {
                        const witness = input.decredWitness;
                        expect(witness.script.toString('hex')).toEqual(expected.script);
                        expect(witness.value).toEqual(expected.value);
                        expect(witness.height).toEqual(expected.height);
                        expect(witness.blockIndex).toEqual(expected.blockIndex);
                    }
                });
                tx.outs.forEach((output, i) => {
                    expect(output.value).toEqual(f.raw.outs[i].value);
                    expect(output.script.toString('hex')).toEqual(f.raw.outs[i].script);
                    expect(output.decredVersion).toEqual(f.raw.outs[i].version);
                });

                expect(tx.toHex()).toEqual(f.hex);
            });
        });

        // Zcash fixtures are incomplete
        fixturesZcash.valid.forEach(f => {
            it(`Zcash ${f.description}`, () => {
                const tx = Transaction.fromHex(f.hex, { network: NETWORKS.zcash });
                expect(tx.version).toEqual(f.version);
                expect(tx.locktime).toEqual(f.locktime);
                expect(tx.expiry).toEqual(f.expiry);
                expect(tx.ins.length).toEqual(f.insLength);
                expect(tx.outs.length).toEqual(f.outsLength);
                expect(tx.toHex()).toEqual(f.hex);
            });
        });

        it('.version should be interpreted as an int32le', () => {
            const txHex = 'ffffffff0000ffffffff';
            const tx = Transaction.fromHex(txHex);
            expect(tx.version).toEqual(-1);
            expect(tx.locktime).toEqual(0xffffffff);
        });

        fixturesBitcoin.hashForSignature.forEach(f => {
            it(`${f.description} (${f.hash})`, () => {
                const tx = Transaction.fromHex(f.txHex);
                expect(tx.toHex()).toEqual(f.txHex);
            });
        });

        fixturesBitcoin.hashForWitnessV0.forEach(f => {
            it(`${f.description} (${f.hash})`, () => {
                const tx = Transaction.fromHex(f.txHex);
                expect(tx.toHex()).toEqual(f.txHex);
            });
        });

        fixturesBitcoin.invalid.fromBuffer.forEach(f => {
            it(`throws on ${f.exception}`, () => {
                expect(() => Transaction.fromHex(f.hex)).toThrow(f.exception);
            });
        });

        fixturesDecred.invalid.forEach(f => {
            it(`Decred: throws ${f.exception} for ${f.description}`, () => {
                expect(() => Transaction.fromHex(f.hex, { network: NETWORKS.decred })).toThrow(
                    f.exception,
                );
            });
        });
    });

    describe('toBuffer/toHex', () => {
        fixturesBitcoin.valid.forEach(f => {
            it(`exports ${f.description} (${f.id})`, () => {
                const actual = utils.fromRaw(f.raw, { noWitness: true });
                expect(actual.toHex()).toEqual(f.hex);
            });

            if (f.whex) {
                it(`exports ${f.description} (${f.id}) as witness`, () => {
                    const wactual = utils.fromRaw(f.raw);
                    expect(wactual.toHex()).toEqual(f.whex);
                });
            }
        });

        fixturesDash.valid.forEach(f => {
            it(`Dash: exports ${f.description}`, () => {
                const actual = utils.fromRaw(f.raw, {
                    network: NETWORKS.dashTest,
                    txSpecific: {
                        type: 'dash',
                        extraPayload: f.raw.extraPayload
                            ? Buffer.from(f.raw.extraPayload, 'hex')
                            : undefined,
                    },
                });
                actual.type = f.raw.type;
                expect(actual.toHex()).toEqual(f.hex);
            });
        });

        fixturesDoge.valid.forEach(f => {
            it(`Doge: exports ${f.description} (${f.hash})`, () => {
                const actual = utils.fromRaw(f.raw);
                expect(actual.toHex()).toEqual(f.hex);
            });
        });

        // fixturesKomodo.valid.forEach(f => {
        //     it(`Komodo: exports ${f.description} (${f.hash})`, () => {
        //         const actual = utils.fromRaw(f.raw, { network: NETWORKS.komodo, txSpecific: {} });
        //         expect(actual.toHex()).toEqual(f.hex);
        //     });
        // });

        fixturesPeercoin.valid.forEach(f => {
            it(`Peercoin: exports ${f.description} (${f.hash})`, () => {
                const actual = utils.fromRaw(f.raw, { network: NETWORKS.peercoin });
                actual.timestamp = f.raw.timestamp;
                expect(actual.toHex()).toEqual(f.hex);
            });
        });

        // decred

        // zcash
    });

    describe('hasWitnesses', () => {
        // [...fixturesBitcoin.valid, ...fixturesDash.valid].forEach((f: any) => {
        fixturesBitcoin.valid.forEach(f => {
            it(`detects if the transaction has witnesses: ${f.whex ? 'true' : 'false'}`, () => {
                const tx = Transaction.fromHex(f.whex || f.hex);
                expect(tx.hasWitnesses()).toEqual(!!f.whex);
            });
        });
    });

    describe('weight/virtualSize', () => {
        [
            ...fixturesBitcoin.valid,
            ...fixturesDash.valid,
            ...fixturesDoge.valid,
            // ...fixturesDecred.valid,
            ...fixturesKomodo.valid,
            // ...fixturesZcash.valid,
        ].forEach((f: any) => {
            it(f.description, () => {
                const tx = Transaction.fromHex(f.whex || f.hex, {
                    network: utils.getNetwork(f.network),
                });
                expect(tx.weight()).toEqual(f.weight);
                expect(tx.virtualSize()).toEqual(f.virtualSize);
            });
        });
    });

    describe('getHash/getId', () => {
        fixturesBitcoin.valid.forEach(f => {
            it(`should return the id for ${f.id}(${f.description})`, () => {
                const tx = Transaction.fromHex(f.whex || f.hex);
                expect(tx.getHash().toString('hex')).toEqual(f.hash);
                expect(tx.getId()).toEqual(f.id);
            });
        });
    });

    describe('isCoinbase', () => {
        fixturesBitcoin.valid.forEach(f => {
            it(`should return ${f.coinbase} for ${f.id}(${f.description})`, () => {
                const tx = Transaction.fromHex(f.hex);
                expect(tx.isCoinbase()).toEqual(f.coinbase);
            });
        });
    });

    describe('getExtraData', () => {
        fixturesDash.valid.forEach(f => {
            it(`Dash: imports ${f.description}`, () => {
                const tx = Transaction.fromHex(f.hex, { network: NETWORKS.dashTest });
                const extraData = tx.getExtraData();
                expect(extraData?.toString('hex')).toEqual(f.extraData);
            });
        });

        fixturesZcash.valid.forEach(f => {
            it(`Zcash: ${f.description}`, () => {
                const tx = Transaction.fromHex(f.hex, { network: NETWORKS.zcash });
                const extraData = tx.getExtraData();
                expect(extraData?.toString('hex')).toEqual(f.extraData);
            });
        });
    });

    describe('getSpecificData', () => {
        fixturesZcash.valid.forEach(f => {
            it(`Zcash: ${f.description}`, () => {
                const tx = Transaction.fromHex(f.hex, { network: NETWORKS.zcash });
                const specificData = tx.getSpecificData();
                if (specificData?.type !== 'zcash') throw Error('not a zcash tx');
                expect(specificData.versionGroupId).toEqual(
                    typeof f.versionGroupId === 'number'
                        ? f.versionGroupId
                        : parseInt(f.versionGroupId, 16),
                );
                expect(specificData.overwintered).toEqual(f.overwintered);
                expect(specificData.joinsplits.length).toEqual(f.joinsplitsLength);
                expect(specificData.joinsplitPubkey.length).toEqual(f.joinsplitPubkeyLength);
                expect(specificData.joinsplitSig.length).toEqual(f.joinsplitSigLength);

                if (f.valueBalance) {
                    expect(specificData.valueBalance).toEqual(f.valueBalance);
                }
                if (f.nShieldedSpend) {
                    const shieldedSpend = specificData.vShieldedSpend;
                    for (let i = 0; i < f.nShieldedSpend; ++i) {
                        expect(shieldedSpend[i].cv.toString('hex')).toEqual(f.vShieldedSpend[i].cv);
                        expect(shieldedSpend[i].anchor.toString('hex')).toEqual(
                            f.vShieldedSpend[i].anchor,
                        );
                        expect(shieldedSpend[i].nullifier.toString('hex')).toEqual(
                            f.vShieldedSpend[i].nullifier,
                        );
                        expect(shieldedSpend[i].rk.toString('hex')).toEqual(f.vShieldedSpend[i].rk);
                        expect(
                            shieldedSpend[i].zkproof.sA.toString('hex') +
                                shieldedSpend[i].zkproof.sB.toString('hex') +
                                shieldedSpend[i].zkproof.sC.toString('hex'),
                        ).toEqual(f.vShieldedSpend[i].zkproof);
                        expect(shieldedSpend[i].spendAuthSig.toString('hex')).toEqual(
                            f.vShieldedSpend[i].spendAuthSig,
                        );
                    }
                }
            });
        });
    });
});
