import TinyWorker from 'tiny-worker';
import BlockbookWorkerModule from '../../../build/module/blockbook-worker';
import RippleWorkerModule from '../../../build/module/ripple-worker';
import CardanoWorkerModule from '../../../build/module/cardano-worker';

export const rippleWorkerFactory = () => {
    if (typeof Worker === 'undefined') {
        return new TinyWorker('./build/node/ripple-worker.js');
        // return new TinyWorker(() => {
        //     require('@babel/register')({ cache: true });
        //     require('../../../lib/workers/ripple/index.js');
        // });
    }
    return new Worker('./build/web/ripple-worker.js');
};

export const rippleModuleFactory = () => {
    return new RippleWorkerModule();
};

export const blockbookWorkerFactory = () => {
    if (typeof Worker === 'undefined') {
        return new TinyWorker('./build/node/blockbook-worker.js');
        // return new TinyWorker(() => {
        //     require('@babel/register')({ cache: true });
        //     require('../../../lib/workers/blockbook/index.js');
        // });
    }
    return new Worker('./build/web/blockbook-worker.js');
};

export const blockbookModuleFactory = () => {
    return new BlockbookWorkerModule();
};

export const cardanoWorkerFactory = () => {
    if (typeof Worker === 'undefined') {
        return new TinyWorker('./build/node/cardano-worker.js');
    }
    return new Worker('./build/web/cardano-worker.js');
};

export const cardanoModuleFactory = () => {
    return new CardanoWorkerModule();
};
