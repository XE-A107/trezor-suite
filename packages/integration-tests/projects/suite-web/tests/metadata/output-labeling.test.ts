// @group:metadata
// @retry=2

import { rerouteMetadataToMockProvider, stubOpen } from '../../stubs/metadata';

const providers = ['google', 'dropbox'] as const;

describe('Metadata - Output labeling', () => {
    beforeEach(() => {
        cy.viewport(1024, 768).resetDb();
    });

    providers.forEach(provider => {
        it(provider, () => {
            const targetEl1 =
                '@metadata/outputLabel/9f472739fa7034dfb9736fa4d98915f2e8ddf70a86ee5e0a9ac0634f8c1d0007-0/add-label-button';
            // prepare test
            cy.task('startEmu', { version: Cypress.env('emuVersionT2'), wipe: true });
            cy.task('setupEmu', {
                mnemonic: 'all all all all all all all all all all all all',
            });
            cy.task('startBridge');
            cy.task('metadataStartProvider', provider);

            const sentToMyselfEl =
                '@metadata/outputLabel/40242836cc07b635569688d12d63041935b86feb2db3fe575be80f2c44e5b4cb-0';

            cy.prefixedVisit('/', {
                onBeforeLoad: (win: Window) => {
                    cy.stub(win, 'open', stubOpen(win));
                    cy.stub(win, 'fetch', rerouteMetadataToMockProvider);
                },
            });

            cy.passThroughInitialRun();

            cy.discoveryShouldFinish();
            cy.getTestElement('@suite/menu/wallet-index').click();

            cy.getTestElement(targetEl1).click({ force: true });
            cy.passThroughInitMetadata(provider);
            cy.getTestElement('@metadata/input').type('mnau cool label{enter}');

            cy.log('go to legacy account 6, it has txs with multiple outputs');
            cy.getTestElement('@account-menu/legacy').click();
            cy.getTestElement('@account-menu/btc/legacy/5/label').click();
            cy.getTestElement(
                '@metadata/outputLabel/b649a09e6d5d02b3cb4648a42511177efb6abf44366f30a51c1b202d52335d18-0/add-label-button',
            ).click({ force: true });

            cy.getTestElement(
                '@metadata/outputLabel/b649a09e6d5d02b3cb4648a42511177efb6abf44366f30a51c1b202d52335d18-1/add-label-button',
            ).click({ force: true });
            cy.getTestElement('@metadata/submit').should('have.length', 1);

            cy.getTestElement(
                '@metadata/outputLabel/b649a09e6d5d02b3cb4648a42511177efb6abf44366f30a51c1b202d52335d18-2/add-label-button',
            ).click({ force: true });
            cy.getTestElement('@metadata/input').type('output 3{enter}');

            cy.log('label "send to myself tx"');
            cy.getTestElement('@account-menu/btc/legacy/9/label').click();
            cy.getTestElement(`${sentToMyselfEl}/add-label-button`).click({ force: true });
            cy.getTestElement('@metadata/input').type('really to myself{enter}');

            cy.getTestElement(sentToMyselfEl).click({ force: true });
            // dropdown/
            cy.getTestElement(`${sentToMyselfEl}/dropdown/edit-label`).click({ force: true });
            cy.getTestElement('@metadata/input').type(' edited{enter}');

            cy.getTestElement(`${sentToMyselfEl}`).click({ force: true });
            // todo: don't know why this does not end with success in tests but works for me when trying it manually.
            cy.getTestElement(`${sentToMyselfEl}/dropdown/copy-address`).click({ force: true });

            // test that buttons work as well - submit button
            cy.getTestElement(`${sentToMyselfEl}`).click({ force: true });
            cy.getTestElement(`${sentToMyselfEl}/dropdown/edit-label`).click({ force: true });
            cy.getTestElement('@metadata/input').clear().type('submitted by button');
            cy.getTestElement('@metadata/submit').click({ force: true });
            cy.getTestElement(`${sentToMyselfEl}`).should('contain', 'submitted by button');

            // test that buttons work as well - cancel button
            cy.getTestElement(`${sentToMyselfEl}`).click({ force: true });
            cy.getTestElement(`${sentToMyselfEl}/dropdown/edit-label`).click({ force: true });
            cy.getTestElement('@metadata/input').clear().type('write something that wont be saved');
            cy.getTestElement('@metadata/cancel').click({ force: true });
            cy.getTestElement(`${sentToMyselfEl}`).should('contain', 'submitted by button');
        });
    });
});
