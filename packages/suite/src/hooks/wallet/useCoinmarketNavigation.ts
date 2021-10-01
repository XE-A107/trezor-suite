import { useCallback } from 'react';
import { Account } from '@wallet-types';
import * as routerActions from '@suite-actions/routerActions';
import { useActions } from '@suite-hooks';

export const useCoinmarketNavigation = (account: Account) => {
    const { goto } = useActions({
        goto: routerActions.goto,
    });
    const useNavigateToRouteName = (routeName: Parameters<typeof goto>[0]) =>
        useCallback(() => {
            goto(routeName, {
                symbol: account.symbol,
                accountIndex: account.index,
                accountType: account.accountType,
            });
        }, [routeName]);

    return {
        navigateToBuy: useNavigateToRouteName('wallet-coinmarket-buy'),
        navigateToExchange: useNavigateToRouteName('wallet-coinmarket-exchange'),
        navigateToSell: useNavigateToRouteName('wallet-coinmarket-sell'),
    };
};
