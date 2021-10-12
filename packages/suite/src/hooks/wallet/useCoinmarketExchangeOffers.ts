import { createContext, useContext, useState, useEffect } from 'react';
import invityAPI from '@suite-services/invityAPI';
import { useActions, useSelector, useDevice } from '@suite-hooks';
import { useTimer } from '@suite-hooks/useTimeInterval';
import { ExchangeCoinInfo, ExchangeTrade } from 'invity-api';
import * as coinmarketCommonActions from '@wallet-actions/coinmarket/coinmarketCommonActions';
import * as coinmarketExchangeActions from '@wallet-actions/coinmarketExchangeActions';
import * as routerActions from '@suite-actions/routerActions';
import { Account } from '@wallet-types';
import { Props, ContextValues, ExchangeStep } from '@wallet-types/coinmarketExchangeOffers';
import * as notificationActions from '@suite-actions/notificationActions';
import { splitToQuoteCategories } from '@wallet-utils/coinmarket/exchangeUtils';
import networks from '@wallet-config/networks';
import { getUnusedAddressFromAccount } from '@wallet-utils/coinmarket/coinmarketUtils';
import { useCoinmarketRecomposeAndSign } from './useCoinmarketRecomposeAndSign ';

const getReceiveAccountSymbol = (
    symbol?: string,
    exchangeCoinInfo?: ExchangeCoinInfo[],
): string | undefined => {
    if (symbol) {
        // check if the symbol is ETH token, in that case use ETH network as receiving account
        const coinInfo = exchangeCoinInfo?.find(ci => ci.ticker === symbol);
        if (coinInfo?.token === 'ETH') {
            return 'eth';
        }
        return symbol.toLowerCase();
    }

    return symbol;
};

export const useOffers = (props: Props) => {
    const timer = useTimer();
    const REFETCH_INTERVAL_IN_SECONDS = 30;
    const {
        selectedAccount,
        quotesRequest,
        fixedQuotes,
        floatQuotes,
        dexQuotes,
        exchangeInfo,
        device,
        addressVerified,
    } = props;

    const { isLocked } = useDevice();
    const { account } = selectedAccount;
    const [callInProgress, setCallInProgress] = useState<boolean>(isLocked() || false);
    const [selectedQuote, setSelectedQuote] = useState<ExchangeTrade>();
    const [receiveAccount, setReceiveAccount] = useState<Account | undefined>();
    const [suiteReceiveAccounts, setSuiteReceiveAccounts] =
        useState<ContextValues['suiteReceiveAccounts']>();
    const [innerFixedQuotes, setInnerFixedQuotes] = useState<ExchangeTrade[]>(fixedQuotes);
    const [innerFloatQuotes, setInnerFloatQuotes] = useState<ExchangeTrade[]>(floatQuotes);
    const [innerDexQuotes, setInnerDexQuotes] = useState<ExchangeTrade[]>(dexQuotes);
    const [exchangeStep, setExchangeStep] = useState<ExchangeStep>('RECEIVING_ADDRESS');
    const {
        goto,
        saveTrade,
        openCoinmarketExchangeConfirmModal,
        saveTransactionId,
        addNotification,
        verifyAddress,
    } = useActions({
        goto: routerActions.goto,
        saveTrade: coinmarketExchangeActions.saveTrade,
        openCoinmarketExchangeConfirmModal:
            coinmarketExchangeActions.openCoinmarketExchangeConfirmModal,
        saveTransactionId: coinmarketExchangeActions.saveTransactionId,
        addNotification: notificationActions.addToast,
        verifyAddress: coinmarketCommonActions.verifyAddress,
    });

    const { invityAPIUrl, exchangeCoinInfo, accounts } = useSelector(state => ({
        invityAPIUrl: state.suite.settings.debug.invityAPIUrl,
        exchangeCoinInfo: state.wallet.coinmarket.exchange.exchangeCoinInfo,
        accounts: state.wallet.accounts,
    }));

    const { recomposeAndSign } = useCoinmarketRecomposeAndSign();

    if (invityAPIUrl) {
        invityAPI.setInvityAPIServer(invityAPIUrl);
    }

    useEffect(() => {
        if (!quotesRequest) {
            goto('wallet-coinmarket-exchange', {
                symbol: account.symbol,
                accountIndex: account.index,
                accountType: account.accountType,
            });
            return;
        }

        const getQuotes = async () => {
            if (!selectedQuote) {
                invityAPI.createInvityAPIKey(account.descriptor);
                setCallInProgress(true);
                const allQuotes = await invityAPI.getExchangeQuotes(quotesRequest);
                setCallInProgress(false);
                const [fixedQuotes, floatQuotes, dexQuotes] = splitToQuoteCategories(
                    allQuotes,
                    exchangeInfo,
                );
                setInnerFixedQuotes(fixedQuotes);
                setInnerFloatQuotes(floatQuotes);
                setInnerDexQuotes(dexQuotes);
                timer.reset();
            }
        };

        if (!timer.isLoading && !timer.isStopped) {
            if (timer.resetCount >= 40) {
                timer.stop();
            }

            if (timer.timeSpend.seconds === REFETCH_INTERVAL_IN_SECONDS) {
                timer.loading();
                getQuotes();
            }
        }
    });

    const selectQuote = async (quote: ExchangeTrade) => {
        const provider =
            exchangeInfo?.providerInfos && quote.exchange
                ? exchangeInfo?.providerInfos[quote.exchange]
                : null;
        if (quotesRequest) {
            const result = await openCoinmarketExchangeConfirmModal(provider?.companyName);
            if (result) {
                setSelectedQuote(quote);
                timer.stop();
            }
        }
    };

    const receiveSymbol = getReceiveAccountSymbol(selectedQuote?.receive, exchangeCoinInfo);

    useEffect(() => {
        if (selectedQuote && exchangeStep === 'RECEIVING_ADDRESS') {
            const unavailableCapabilities = device?.unavailableCapabilities ?? {};
            // is the symbol supported by the suite and the device natively
            const receiveNetworks = networks.filter(
                n => n.symbol === receiveSymbol && !unavailableCapabilities[n.symbol],
            );
            if (receiveNetworks.length > 0) {
                // get accounts of the current symbol belonging to the current device
                setSuiteReceiveAccounts(
                    accounts.filter(
                        a =>
                            a.deviceState === device?.state &&
                            a.symbol === receiveSymbol &&
                            (!a.empty ||
                                a.visible ||
                                (a.accountType === 'normal' && a.index === 0)),
                    ),
                );
                return;
            }
        }
        setSuiteReceiveAccounts(undefined);
    }, [accounts, device, exchangeStep, receiveSymbol, selectedQuote]);

    const confirmTrade = async (address: string, extraField?: string, trade?: ExchangeTrade) => {
        let ok = false;
        const { address: refundAddress } = getUnusedAddressFromAccount(account);
        if (!trade) {
            trade = selectedQuote;
        }
        if (!trade || !refundAddress) return false;

        console.log('doExchangeTrade request', trade);
        if (trade.isDex && trade.status === 'CONFIRM' && !trade.approvalSendTxHash) {
            setExchangeStep('SEND_TRANSACTION');
            return true;
        }

        setCallInProgress(true);
        const response = await invityAPI.doExchangeTrade({
            trade,
            receiveAddress: address,
            refundAddress,
            extraField,
        });
        console.log('doExchangeTrade response', response);
        if (!response) {
            addNotification({
                type: 'error',
                error: 'No response from the server',
            });
        } else if (
            response.error ||
            !response.status ||
            !response.orderId ||
            response.status === 'ERROR'
        ) {
            addNotification({
                type: 'error',
                error: response.error || 'Error response from the server',
            });
            setSelectedQuote(response);
        } else if (response.status === 'APPROVAL_REQ' || response.status === 'APPROVAL_PENDING') {
            setSelectedQuote(response);
            setExchangeStep('SEND_APPROVAL_TRANSACTION');
            ok = true;
        } else if (response.status === 'CONFIRM') {
            setSelectedQuote(response);
            if (response.isDex) {
                setExchangeStep('SEND_APPROVAL_TRANSACTION');
            } else {
                setExchangeStep('SEND_TRANSACTION');
            }
            ok = true;
        } else {
            // CONFIRMING, SUCCESS
            await saveTrade(response, account, new Date().toISOString());
            await saveTransactionId(response.orderId);
            ok = true;
            goto('wallet-coinmarket-exchange-detail', {
                symbol: account.symbol,
                accountIndex: account.index,
                accountType: account.accountType,
            });
        }
        setCallInProgress(false);
        return ok;
    };

    const sendDexTransaction = async () => {
        if (
            selectedQuote &&
            selectedQuote.dexTx &&
            (selectedQuote.status === 'APPROVAL_REQ' || selectedQuote.status === 'CONFIRM')
        ) {
            const result = await recomposeAndSign(
                selectedAccount,
                selectedQuote.dexTx.to,
                selectedQuote.dexTx.value,
                selectedQuote.partnerPaymentExtraId,
                selectedQuote.dexTx.data,
            );

            // // simulate transaction
            // const result = {
            //     success: true,
            //     payload: {
            //         txid: '0x0fbf6468df8d2f66ca567122964186d4da38e8ee04aa9210040055411c088263', // successful
            //         // txid: '0x4a2e513af96e6fdfc3a125181fca608008a8454d0101df80c1a7616791f79c8f', // failed
            //     },
            // };

            console.log('sendDexTransaction', result);

            // in case of not success, recomposeAndSign shows notification
            if (result?.success) {
                const { txid } = result.payload;
                const quote = { ...selectedQuote };
                if (selectedQuote.status === 'CONFIRM') {
                    quote.receiveTxHash = txid;
                    quote.status = 'CONFIRMING';
                    await saveTrade(quote, account, new Date().toISOString());
                    confirmTrade(quote.receiveAddress || '', undefined, quote);
                } else {
                    quote.approvalSendTxHash = txid;
                    quote.status = 'APPROVAL_PENDING';
                    confirmTrade(quote.receiveAddress || '', undefined, quote);
                }
            }
        } else {
            addNotification({
                type: 'error',
                error: 'Cannot send transaction, missing data',
            });
        }
    };

    const sendTransaction = async () => {
        if (selectedQuote?.isDex) {
            sendDexTransaction();
            return;
        }
        if (
            selectedQuote &&
            selectedQuote.orderId &&
            selectedQuote.sendAddress &&
            selectedQuote.sendStringAmount
        ) {
            const result = await recomposeAndSign(
                selectedAccount,
                selectedQuote.sendAddress,
                selectedQuote.sendStringAmount,
                selectedQuote.partnerPaymentExtraId,
            );
            // in case of not success, recomposeAndSign shows notification
            if (result?.success) {
                await saveTrade(selectedQuote, account, new Date().toISOString());
                await saveTransactionId(selectedQuote.orderId);
                goto('wallet-coinmarket-exchange-detail', {
                    symbol: account.symbol,
                    accountIndex: account.index,
                    accountType: account.accountType,
                });
            }
        } else {
            addNotification({
                type: 'error',
                error: 'Cannot send transaction, missing data',
            });
        }
    };

    return {
        callInProgress,
        confirmTrade,
        sendTransaction,
        selectedQuote,
        setSelectedQuote,
        suiteReceiveAccounts,
        verifyAddress,
        device,
        timer,
        exchangeInfo,
        exchangeStep,
        setExchangeStep,
        saveTrade,
        quotesRequest,
        addressVerified,
        fixedQuotes: innerFixedQuotes,
        floatQuotes: innerFloatQuotes,
        dexQuotes: innerDexQuotes,
        selectQuote,
        account,
        REFETCH_INTERVAL_IN_SECONDS,
        receiveSymbol,
        receiveAccount,
        setReceiveAccount,
    };
};

export const CoinmarketExchangeOffersContext = createContext<ContextValues | null>(null);
CoinmarketExchangeOffersContext.displayName = 'CoinmarketExchangeOffersContext';

export const useCoinmarketExchangeOffersContext = () => {
    const context = useContext(CoinmarketExchangeOffersContext);
    if (context === null) throw Error('CoinmarketExchangeOffersContext used without Context');
    return context;
};
