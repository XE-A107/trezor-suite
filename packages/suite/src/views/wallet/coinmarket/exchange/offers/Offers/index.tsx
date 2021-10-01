import React, { useMemo, useContext } from 'react';
import styled from 'styled-components';
import invityAPI from '@suite-services/invityAPI';
import { LayoutContext, Translation } from '@suite-components';
import {
    CoinmarketExchangeTopPanel,
    CoinmarketFooter,
    CoinmarketRefreshTime,
} from '@wallet-components';
import { variables, Icon, CoinLogo } from '@trezor/components';
import { useCoinmarketExchangeOffersContext } from '@wallet-hooks/useCoinmarketExchangeOffers';
import { useCoinmarketNavigation } from '@wallet-hooks/useCoinmarketNavigation';
import { InvityAPIReloadQuotesAfterSeconds } from '@wallet-constants/coinmarket/metadata';
import List from './List';
import SelectedOffer from './SelectedOffer';
import NoOffers from '@wallet-views/coinmarket/common/no-offers';

const Wrapper = styled.div`
    padding: 0 32px 32px 32px;

    @media screen and (max-width: ${variables.SCREEN_SIZE.LG}) {
        padding: 16px;
    }
`;

const Header = styled.div`
    margin: 18px 0 24px 0;
`;

const SummaryRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: ${variables.FONT_SIZE.H2};
`;

const Text = styled.div`
    display: flex;
    padding-top: 3px;
    align-items: center;
`;

const StyledIcon = styled(Icon)`
    margin: 0 17px;
`;

const Left = styled.div`
    display: flex;
    align-items: center;
`;

const Right = styled.div`
    display: flex;
    justify-self: flex-end;
    align-items: center;
    font-size: ${variables.FONT_SIZE.SMALL};
`;

const StyledCoinLogo = styled(CoinLogo)`
    padding: 0 10px 0 0;
`;

const InvityCoinLogo = styled.img`
    height: 18px;
    padding: 0 10px 0 0;
`;

const TextAmount = styled(Text)`
    padding-right: 10px;
`;

const Offers = () => {
    const {
        fixedQuotes,
        floatQuotes,
        quotesRequest,
        selectedQuote,
        timer,
        account,
        getQuotes,
        callInProgress,
    } = useCoinmarketExchangeOffersContext();
    const { setLayout } = useContext(LayoutContext);
    const { navigateToExchange } = useCoinmarketNavigation(account);

    useMemo(() => {
        if (setLayout) setLayout('Trezor Suite | Trade', undefined, <CoinmarketExchangeTopPanel />);
    }, [setLayout]);

    if (!quotesRequest) return null;
    const quotesCount = fixedQuotes?.length + floatQuotes?.length;
    return (
        <Wrapper>
            {!selectedQuote && (
                <>
                    {!quotesCount && (
                        <NoOffers
                            coinmarketRefreshTimeIsLoading={timer.isLoading || callInProgress}
                            coinmarketRefreshTimeSeconds={timer.timeSpend.seconds}
                            onBackButtonClick={navigateToExchange}
                            onReloadOffersButtonClick={getQuotes}
                        />
                    )}
                    {quotesCount > 0 && (
                        <>
                            <Header>
                                <SummaryRow>
                                    <Left>
                                        <StyledCoinLogo size={21} symbol={account.symbol} />
                                        <TextAmount>{quotesRequest.sendStringAmount}</TextAmount>
                                        <Text>{quotesRequest.send}</Text>
                                        <StyledIcon icon="ARROW_RIGHT_LONG" />
                                        <InvityCoinLogo
                                            src={`${invityAPI.server}/images/coins/suite/${quotesRequest.receive}.svg`}
                                        />
                                        <Text>{quotesRequest.receive}</Text>
                                    </Left>
                                    {!timer.isStopped && (
                                        <Right>
                                            <CoinmarketRefreshTime
                                                isLoading={timer.isLoading}
                                                refetchInterval={InvityAPIReloadQuotesAfterSeconds}
                                                seconds={timer.timeSpend.seconds}
                                                label={
                                                    <Translation id="TR_EXCHANGE_OFFERS_REFRESH" />
                                                }
                                            />
                                        </Right>
                                    )}
                                </SummaryRow>
                            </Header>
                            {fixedQuotes?.length > 0 && <List quotes={fixedQuotes} isFixed />}
                            {floatQuotes?.length > 0 && <List quotes={floatQuotes} />}
                        </>
                    )}
                </>
            )}
            {selectedQuote && <SelectedOffer />}
            <CoinmarketFooter />
        </Wrapper>
    );
};

export default Offers;
