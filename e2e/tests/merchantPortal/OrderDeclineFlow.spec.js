import { test } from '../../globalConfig.ui.js';
import { getPatientAccount } from '../../../api/helpers/roleCredentials.js';
import { createMerchantPortalContext } from './merchantPortalContext.js';
import {
  buildDeliverXHybridOrderInput,
  buildFindMyMedsHybridOrderInput,
  buildPabiliHybridOrderInput,
} from './generic.orderData.js';
import { createHybridOrder } from './actions/patientActions.js';

const defaultPatientAccount = getPatientAccount('default');

test.describe('Merchant Portal | Order Decline Flow', () => {
  // Merchant-tab rule:
  // - merchant-side decline/cancel actions -> Declined tab
  // - user-side cancellations -> Cancelled tab
  test(
    'E2E-16 | DeliverX Order Declined',
    {
      tag: [
        '@ui',
        '@merchant',
        '@positive',
        '@merchant-portal',
        '@e2e-16',
        '@workflow',
        '@hybrid',
        '@deliverx',
        '@decline',
      ],
      // Flow summary: patient creates DeliverX order -> merchant opens order in UI ->
      // merchant declines via UI with Others reason and custom text -> merchant verifies CANCELLED in details and Cancelled tab.
    },
    async ({ page, api }) => {
      const merchant = createMerchantPortalContext(page, { accountKey: 'e2e-reg01' });
      const declineReason = 'declined for automated test E2E-16';

      // API (patient): create DeliverX order bound to active regular merchant branch.
      const { orderId, bookingRef } = await createHybridOrder(api, {
        order: buildDeliverXHybridOrderInput({
          patientId: defaultPatientAccount.patientId,
          branchId: merchant.account.assignedBranchId,
        }),
      });

      // UI (merchant): login and open new order by exact booking reference.
      await merchant.loginPage.open();
      await merchant.loginPage.login(merchant.account.username, merchant.account.password);
      await merchant.loginPage.assertSuccessLogin();

      await merchant.ordersPage.open();
      await merchant.ordersPage.openNewOrderByBookingRef(bookingRef);

      // UI (merchant): decline order with reason from confirmation modal and close result modal via close (x).
      await merchant.orderDetailsPage.declineOrderWithOthersReason(declineReason);

      // UI (merchant): verify order appears in Orders > Declined tab.
      await merchant.ordersPage.verifyBookingRefPresentInDeclinedTab(bookingRef);
    }
  );

  test(
    'E2E-17 | FindMyMeds Order Declined',
    {
      tag: [
        '@ui',
        '@merchant',
        '@positive',
        '@merchant-portal',
        '@e2e-17',
        '@workflow',
        '@hybrid',
        '@findmymeds',
        '@decline',
      ],
      // Flow summary: patient creates FindMyMeds order -> merchant opens order in UI ->
      // merchant declines via UI with Others reason and custom text -> merchant verifies reason in details and Declined tab.
    },
    async ({ page, api }) => {
      const merchant = createMerchantPortalContext(page, { accountKey: 'e2e-pse01' });
      const declineReason = 'declined for automated test E2E-17';

      // API (patient): create FindMyMeds order using existing hybrid builder behavior.
      const { bookingRef } = await createHybridOrder(api, {
        order: buildFindMyMedsHybridOrderInput({
          patientId: defaultPatientAccount.patientId,
          allowMissingBranchId: true,
        }),
      });

      // UI (merchant): login and open new order by exact booking reference.
      await merchant.loginPage.open();
      await merchant.loginPage.login(merchant.account.username, merchant.account.password);
      await merchant.loginPage.assertSuccessLogin();

      await merchant.ordersPage.open();
      await merchant.ordersPage.openNewOrderByBookingRef(bookingRef);

      // UI (merchant): decline order with reason from confirmation modal and close result modal via close (x).
      await merchant.orderDetailsPage.declineOrderWithOthersReason(declineReason);

      // UI (merchant): verify order appears in Orders > Declined tab.
      await merchant.ordersPage.verifyBookingRefPresentInDeclinedTab(bookingRef);
    }
  );

  test(
    'E2E-18 | Pabili Order Declined',
    {
      tag: [
        '@ui',
        '@merchant',
        '@positive',
        '@merchant-portal',
        '@e2e-18',
        '@workflow',
        '@hybrid',
        '@pabili',
        '@decline',
      ],
      // Flow summary: patient creates Pabili order -> merchant opens order in UI ->
      // merchant declines via UI with Others reason and custom text -> merchant verifies reason in details and Declined tab.
    },
    async ({ page, api }) => {
      const merchant = createMerchantPortalContext(page, { accountKey: 'e2e-pse01' });
      const declineReason = 'declined for automated test E2E-18';

      // API (patient): create Pabili order bound to active PSE merchant branch.
      const { bookingRef } = await createHybridOrder(api, {
        order: buildPabiliHybridOrderInput({
          patientId: defaultPatientAccount.patientId,
          branchId: merchant.account.assignedBranchId,
        }),
      });

      // UI (merchant): login and open new order by exact booking reference.
      await merchant.loginPage.open();
      await merchant.loginPage.login(merchant.account.username, merchant.account.password);
      await merchant.loginPage.assertSuccessLogin();

      await merchant.ordersPage.open();
      await merchant.ordersPage.openNewOrderByBookingRef(bookingRef);

      // UI (merchant): decline order with reason from confirmation modal and close result modal via close (x).
      await merchant.orderDetailsPage.declineOrderWithOthersReason(declineReason);

      // UI (merchant): verify order appears in Orders > Declined tab.
      await merchant.ordersPage.verifyBookingRefPresentInDeclinedTab(bookingRef);
    }
  );
});
