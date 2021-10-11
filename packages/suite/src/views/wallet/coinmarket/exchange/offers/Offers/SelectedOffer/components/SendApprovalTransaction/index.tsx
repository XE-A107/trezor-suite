import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Translation, AccountLabeling } from '@suite-components';
import { Button, Loader, P, RadioButton, variables } from '@trezor/components';
import { useCoinmarketExchangeOffersContext } from '@wallet-hooks/useCoinmarketExchangeOffers';
import { DexApprovalType, ExchangeTrade } from 'invity-api';
import useTimeoutFn from 'react-use/lib/useTimeoutFn';
import useUnmount from 'react-use/lib/useUnmount';
import invityAPI from '@suite-services/invityAPI';
import { useActions } from '@suite-hooks/useActions';
import * as routerActions from '@suite-actions/routerActions';

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    margin-top: 10px;
`;

const LabelText = styled.div`
    font-size: ${variables.FONT_SIZE.TINY};
    color: ${props => props.theme.TYPE_LIGHT_GREY};
`;

const Value = styled.div`
    padding-top: 6px;
    font-size: ${variables.FONT_SIZE.SMALL};
    color: ${props => props.theme.TYPE_DARK_GREY};
    font-weight: ${variables.FONT_WEIGHT.MEDIUM};
`;

const BreakableValue = styled(Value)`
    word-break: break-all;
`;

const ButtonWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 20px;
    border-top: 1px solid ${props => props.theme.STROKE_GREY};
    margin: 20px 0;
`;

const Row = styled.div`
    margin: 10px 24px;
`;

const RadioButtonInner = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-center;
    justify-self: center;
`;

const Address = styled.div``;

const Title = styled.div`
    margin-top: 25px;
    font-weight: ${variables.FONT_WEIGHT.DEMI_BOLD};
`;

const LoaderWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 20px 60px 20px;
    flex-direction: column;
`;

const ErrorWrapper = styled(LoaderWrapper)`
    color: ${props => props.theme.TYPE_RED};
`;

const REFRESH_SECONDS = 15;

const shouldRefresh = (quote?: ExchangeTrade) => quote?.status === 'APPROVAL_PENDING';

const SendApprovalTransactionComponent = () => {
    const {
        account,
        callInProgress,
        selectedQuote,
        setSelectedQuote,
        exchangeInfo,
        confirmTrade,
        sendTransaction,
    } = useCoinmarketExchangeOffersContext();
    const [approvalType, setApprovalType] = useState<DexApprovalType>('MINIMAL');
    const [refreshCount, setRefreshCount] = useState(0);
    const invokeRefresh = () => {
        if (shouldRefresh(selectedQuote)) {
            setRefreshCount(prevValue => prevValue + 1);
        }
    };
    const [, cancelRefresh, resetRefresh] = useTimeoutFn(invokeRefresh, REFRESH_SECONDS * 1000);

    useUnmount(() => {
        cancelRefresh();
    });

    useEffect(() => {
        if (selectedQuote && shouldRefresh(selectedQuote)) {
            cancelRefresh();
            invityAPI.watchExchangeTrade(selectedQuote, refreshCount).then(response => {
                if (response.status && response.status !== selectedQuote.status) {
                    const updatedQuote = { ...selectedQuote, ...response };
                    setSelectedQuote(updatedQuote);
                }
            });
            resetRefresh();
        }
    }, [cancelRefresh, refreshCount, resetRefresh, selectedQuote, setSelectedQuote]);

    const { goto } = useActions({
        goto: routerActions.goto,
    });

    if (!selectedQuote) return null;

    const { exchange, dexTx } = selectedQuote;
    if (!exchange || !dexTx) return null;

    const providerName =
        exchangeInfo?.providerInfos[exchange]?.companyName || selectedQuote.exchange;

    const translationValues = {
        value: selectedQuote.approvalStringAmount,
        send: selectedQuote.send,
        provider: providerName,
    };

    const selectApprovalValue = (type: DexApprovalType) => {
        setApprovalType(type);
        selectedQuote.approvalType = type;
        confirmTrade(dexTx.from);
    };

    return (
        <Wrapper>
            <Row>
                <LabelText>
                    <Translation id="TR_EXCHANGE_SEND_FROM" />
                </LabelText>
                <Value>
                    <AccountLabeling account={account} />
                </Value>
            </Row>
            <Row>
                <LabelText>
                    <Translation id="TR_EXCHANGE_APPROVAL_SEND_TO" values={translationValues} />
                </LabelText>
                <Value>
                    <Address>{dexTx.to}</Address>
                </Value>
            </Row>

            {selectedQuote.approvalSendTxHash && (
                <Row>
                    <LabelText>
                        <Translation id="TR_EXCHANGE_APPROVAL_TXID" />
                    </LabelText>
                    <Value>
                        <Address>{selectedQuote.approvalSendTxHash}</Address>
                    </Value>
                </Row>
            )}
            {selectedQuote.status === 'APPROVAL_PENDING' && (
                <LoaderWrapper>
                    <Loader />
                    <Title>
                        <Translation id="TR_EXCHANGE_APPROVAL_CONFIRMING" />
                    </Title>
                </LoaderWrapper>
            )}
            {selectedQuote.status === 'ERROR' && (
                <ErrorWrapper>
                    <Title>
                        <Translation id="TR_EXCHANGE_APPROVAL_FAILED" />
                    </Title>
                </ErrorWrapper>
            )}
            {selectedQuote.status === 'CONFIRM' && (
                <LoaderWrapper>
                    <Title>
                        {selectedQuote.send === 'ETH' && (
                            <Translation id="TR_EXCHANGE_APPROVAL_NOT_REQUIRED" />
                        )}
                        {selectedQuote.send !== 'ETH' && selectedQuote.approvalSendTxHash && (
                            <Translation id="TR_EXCHANGE_APPROVAL_SUCCESS" />
                        )}
                        {selectedQuote.send !== 'ETH' && !selectedQuote.approvalSendTxHash && (
                            <Translation id="TR_EXCHANGE_APPROVAL_PREAPPROVED" />
                        )}
                    </Title>
                </LoaderWrapper>
            )}

            {(selectedQuote.status === 'APPROVAL_REQ' || selectedQuote.status === 'CONFIRM') && (
                <Row>
                    {selectedQuote.status === 'APPROVAL_REQ' && (
                        <>
                            <LabelText>
                                <Translation id="TR_EXCHANGE_APPROVAL_VALUE" />
                            </LabelText>
                            <Value>
                                <RadioButton
                                    isChecked={approvalType === 'MINIMAL'}
                                    onClick={() => selectApprovalValue('MINIMAL')}
                                >
                                    <RadioButtonInner>
                                        <P>
                                            <Translation
                                                id="TR_EXCHANGE_APPROVAL_VALUE_MINIMAL"
                                                values={translationValues}
                                            />
                                        </P>
                                        <LabelText>
                                            <Translation
                                                id="TR_EXCHANGE_APPROVAL_VALUE_MINIMAL_INFO"
                                                values={translationValues}
                                            />
                                        </LabelText>
                                    </RadioButtonInner>
                                </RadioButton>
                            </Value>
                            <Value>
                                <RadioButton
                                    isChecked={approvalType === 'INFINITE'}
                                    onClick={() => selectApprovalValue('INFINITE')}
                                >
                                    <RadioButtonInner>
                                        <P>
                                            <Translation
                                                id="TR_EXCHANGE_APPROVAL_VALUE_INFINITE"
                                                values={translationValues}
                                            />
                                        </P>
                                        <LabelText>
                                            <Translation
                                                id="TR_EXCHANGE_APPROVAL_VALUE_INFINITE_INFO"
                                                values={translationValues}
                                            />
                                        </LabelText>
                                    </RadioButtonInner>
                                </RadioButton>
                            </Value>
                        </>
                    )}
                    <Value>
                        <RadioButton
                            isChecked={approvalType === 'ZERO'}
                            onClick={() => selectApprovalValue('ZERO')}
                        >
                            <RadioButtonInner>
                                <P>
                                    <Translation
                                        id="TR_EXCHANGE_APPROVAL_VALUE_ZERO"
                                        values={translationValues}
                                    />
                                </P>
                                <LabelText>
                                    <Translation
                                        id="TR_EXCHANGE_APPROVAL_VALUE_ZERO_INFO"
                                        values={translationValues}
                                    />
                                </LabelText>
                            </RadioButtonInner>
                            {selectedQuote.status === 'CONFIRM' && (
                                <Button
                                    variant="tertiary"
                                    isLoading={callInProgress}
                                    isDisabled={callInProgress}
                                    onClick={sendTransaction}
                                >
                                    <Translation id="TR_EXCHANGE_CONFIRM_ON_TREZOR_SEND" />
                                </Button>
                            )}
                        </RadioButton>
                    </Value>
                </Row>
            )}

            {dexTx.data && selectedQuote.status !== 'CONFIRM' && (
                <Row>
                    <LabelText>
                        <Translation id="TR_EXCHANGE_APPROVAL_DATA" />
                    </LabelText>
                    <BreakableValue>
                        <P size="small">{dexTx.data}</P>
                    </BreakableValue>
                </Row>
            )}

            {selectedQuote.status === 'APPROVAL_REQ' && (
                <ButtonWrapper>
                    <Button
                        isLoading={callInProgress}
                        isDisabled={callInProgress}
                        onClick={sendTransaction}
                    >
                        <Translation id="TR_EXCHANGE_CONFIRM_ON_TREZOR_SEND" />
                    </Button>
                </ButtonWrapper>
            )}

            {selectedQuote.status === 'ERROR' && (
                <ButtonWrapper>
                    <Button
                        onClick={() =>
                            goto('wallet-coinmarket-exchange', {
                                symbol: account.symbol,
                                accountIndex: account.index,
                                accountType: account.accountType,
                            })
                        }
                    >
                        <Translation id="TR_EXCHANGE_DETAIL_ERROR_BUTTON" />
                    </Button>
                </ButtonWrapper>
            )}

            {selectedQuote.status === 'CONFIRM' && (
                <ButtonWrapper>
                    <Button
                        isLoading={callInProgress}
                        isDisabled={callInProgress}
                        onClick={() => confirmTrade(selectedQuote.receiveAddress || '', undefined)}
                    >
                        <Translation id="TR_EXCHANGE_APPROVAL_TO_SWAP_BUTTON" />
                    </Button>
                </ButtonWrapper>
            )}
        </Wrapper>
    );
};

export default SendApprovalTransactionComponent;
