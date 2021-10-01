import React from 'react';
import styled from 'styled-components';
import { Translation, Image } from '@suite-components';
import { CoinmarketRefreshTime } from '@wallet-components';
import { Button } from '@trezor/components';
import { InvityAPIReloadQuotesAfterSeconds } from '@wallet-constants/coinmarket/metadata';

interface Props {
    coinmarketRefreshTimeIsLoading: boolean;
    coinmarketRefreshTimeSeconds: number;
    onBackButtonClick: () => void;
    onReloadOffersButtonClick: () => void;
}

const NoOffersWrapper = styled.div`
    display: flex;
    justify-content: center;
    flex-direction: column;
    min-height: 300px;
    align-items: center;
    flex: 1;
`;

const NoOffersImage = styled.div`
    padding-bottom: 40px;
`;

const NoOffersHeader = styled.h3`
    padding-bottom: 20px;
`;
const NoOffersMessage = styled.span``;

const ButtonsWrapper = styled.div`
    display: flex;
    justify-content: space-between;
    & > * + * {
        margin-left: 12px;
    }
`;

const NoOffers = ({
    coinmarketRefreshTimeIsLoading,
    coinmarketRefreshTimeSeconds,
    onBackButtonClick,
    onReloadOffersButtonClick,
}: Props) => (
    <NoOffersWrapper>
        <NoOffersImage>
            <Image image="NO_TRANSACTION" />
        </NoOffersImage>
        <NoOffersHeader>
            <Translation id="TR_COINMARKET_NO_OFFERS_HEADER" />
        </NoOffersHeader>
        <NoOffersMessage>
            <Translation id="TR_COINMARKET_NO_OFFERS_MESSAGE" />
        </NoOffersMessage>
        <CoinmarketRefreshTime
            isLoading={coinmarketRefreshTimeIsLoading}
            refetchInterval={InvityAPIReloadQuotesAfterSeconds}
            seconds={coinmarketRefreshTimeSeconds}
            label={<Translation id="TR_COINMARKET_NO_OFFERS_AUTORELOADING_IN" />}
        />
        <ButtonsWrapper>
            <Button variant="secondary" onClick={onBackButtonClick}>
                <Translation id="TR_COINMARKET_NO_OFFERS_BACK_BUTTON" />
            </Button>
            <Button isDisabled={coinmarketRefreshTimeIsLoading} onClick={onReloadOffersButtonClick}>
                <Translation id="TR_COINMARKET_NO_OFFERS_RELOAD_PAGE_BUTTON" />
            </Button>
        </ButtonsWrapper>
    </NoOffersWrapper>
);
export default NoOffers;
