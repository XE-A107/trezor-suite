export const fixtures = {
    valid: [
        {
            description: 'p2tr, out (from scripts & key)',
            arguments: {
                pubkey: '03af455f4989d122e9185f8c351dbaecd13adca3eef8a9d38ef8ffed6867e342e3',
                scripts: [
                    '208f5173bc367914e1574aceb3c7232a178a764fb6f14730b6b20bd36394c6c717ac',
                    '2007c7c32d159a27ba1824798b3b1d11e1b85f4dbc9e9fe63d95440a30737496deac',
                    '204d4b27ab455a6e2b03af29a141ef47fc579c8435f563c065bf0dd12e6180ccd4ac',
                ],
                weights: [1, 1, 2],
                network: 'regtest',
            },
            options: {},
            expected: {
                name: 'p2tr',
                output: 'OP_1 a64b94fdd14d11d268ae3aee9669e5489984ec326bc5c593fc1ae28ec9057cab',
                address: 'bcrt1p5e9eflw3f5gay69w8thfv609fzvcfmpjd0zutylurt3gajg90j4stfe7x0',
            },
        },
        {
            description: 'p2tr, out (from scripts & aggregate key)',
            arguments: {
                pubkeys: [
                    '0220040c8338b34cb9c06c6b1bd38095eafa8f9b72398a1084fdb67473d82dfda3',
                    '02d806a63b6e2d83f11f22f9a11ba7a49ac451e8acf57591ec058e422eb997d55e',
                ],
                scripts: [
                    '2020040c8338b34cb9c06c6b1bd38095eafa8f9b72398a1084fdb67473d82dfda3ad20d806a63b6e2d83f11f22f9a11ba7a49ac451e8acf57591ec058e422eb997d55ead',
                    '20d806a63b6e2d83f11f22f9a11ba7a49ac451e8acf57591ec058e422eb997d55ead200dcd7e6035f7ff5c860b78cfdd2bd80b4b160ca99a71654796afde11457e11e7ad',
                    '200dcd7e6035f7ff5c860b78cfdd2bd80b4b160ca99a71654796afde11457e11e7ad2020040c8338b34cb9c06c6b1bd38095eafa8f9b72398a1084fdb67473d82dfda3ad',
                ],
                weights: [1, 1, 2],
                network: 'regtest',
            },
            options: {},
            expected: {
                name: 'p2tr',
                output: 'OP_1 e899def99239f5781302b78a1a817bf9864dff92bb27492288487d3b29a3c761',
                address: 'bcrt1pazvaa7vj886hsyczk79p4qtmlxrymlujhvn5jg5gfp7nk2drcassmkyfy0',
            },
        },
        {
            description: 'p2tr, address from output',
            arguments: {
                output: 'OP_1 618d4140bbf980976a0f4d2ff9bb05a6772866840770452ff405148b872f0dc8',
                network: 'regtest',
            },
            options: {},
            expected: {
                name: 'p2tr',
                address: 'bcrt1pvxx5zs9mlxqfw6s0f5hlnwc95emjse5yqacy2tl5q52ghpe0phyqzwzvwu',
            },
        },
        {
            description: 'p2tr, testnet address from output',
            arguments: {
                output: 'OP_1 d5e89e0b73605abba690ba5e00484e279d006283bed0055a0530fb6a8c9adac7',
                network: 'testnet',
            },
            options: {},
            expected: {
                name: 'p2tr',
                address: 'tb1p6h5fuzmnvpdthf5shf0qqjzwy7wsqc5rhmgq2ks9xrak4ry6mtrscsqvzp',
            },
        },
        {
            description: 'p2tr, output from address',
            arguments: {
                address: 'bcrt1pvxx5zs9mlxqfw6s0f5hlnwc95emjse5yqacy2tl5q52ghpe0phyqzwzvwu',
                network: 'regtest',
            },
            options: {},
            expected: {
                name: 'p2tr',
                output: 'OP_1 618d4140bbf980976a0f4d2ff9bb05a6772866840770452ff405148b872f0dc8',
            },
        },
    ],
    invalid: [],
};
