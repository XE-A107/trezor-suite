import * as networks from '../src/networks';

const { isNetworkType } = networks;

describe('isNetworkType', () => {
    it('dash', () => {
        expect(isNetworkType('dash', networks.dash)).toBe(true);
        expect(isNetworkType('dash', networks.dashTest)).toBe(true);
        expect(isNetworkType('dash', networks.bitcoin)).toBe(false);
    });

    it('decred', () => {
        expect(isNetworkType('decred', networks.decred)).toBe(true);
        expect(isNetworkType('decred', networks.decredSim)).toBe(true);
        expect(isNetworkType('decred', networks.decredTest)).toBe(true);
        expect(isNetworkType('decred', networks.bitcoin)).toBe(false);
    });

    it('peercoin', () => {
        expect(isNetworkType('peercoin', networks.peercoin)).toBe(true);
        expect(isNetworkType('peercoin', networks.peercoinTest)).toBe(true);
        expect(isNetworkType('peercoin', networks.bitcoin)).toBe(false);
    });

    it('zcash', () => {
        expect(isNetworkType('zcash', networks.zcash)).toBe(true);
        expect(isNetworkType('zcash', networks.zcashTest)).toBe(true);
        expect(isNetworkType('zcash', networks.komodo)).toBe(true);
        expect(isNetworkType('zcash', networks.bitcoin)).toBe(false);
    });

    it('invalid params', () => {
        // @ts-expect-error invalid type param
        expect(isNetworkType('invalid-type', {})).toBe(false);
        // network not defined
        expect(isNetworkType('zcash', undefined)).toBe(false);
        // @ts-expect-error invalid network param
        expect(isNetworkType('zcash', {})).toBe(false);
        // @ts-expect-error invalid network param
        expect(isNetworkType('zcash', 'string')).toBe(false);

        expect(
            isNetworkType('zcash', {
                bip32: {
                    public: 1,
                    private: 1,
                },
                pubKeyHash: 1,
                // @ts-expect-error invalid network field
                scriptHash: 'A',
            }),
        ).toBe(false);
    });
});
