import path from 'node:path';
import { test, expect } from '../../globalConfig.ui.js';
import { getPatientAccount, getRiderAccount } from '../../../api/helpers/roleCredentials.js';
import { createMerchantPortalContext } from './merchantPortalContext.js';
import { buildBasePriceItems, buildDeliverXHybridOrderInput } from './generic.orderData.js';
import {
  PatientPayModes,
  acceptQuoteAsPatientWhenReady,
  createHybridOrder,
  ensurePatientPaymentQRCodeAccessible,
  payOrderAsPatientWithProof,
  rateRiderAsPatientForHybrid,
} from './actions/patientActions.js';
import {
  assignRiderToOrderAsAdminForHybrid,
  confirmPaymentAsAdminForHybrid,
  loginAsAdminForHybrid,
} from './actions/adminActions.js';
import { completeDeliveryAsRiderForHybrid } from './actions/riderActions.js';

const defaultPatientAccount = getPatientAccount('default');
const defaultRiderAccount = getRiderAccount('default');

test.describe('Merchant Portal | Planet DeliverX Full Flow', () => {
  test(
    'E2E-14 | DeliverX for Planet Pharmacy Delivery Fulfillment',
    {
      tag: [
        '@ui',
        '@merchant',
        '@positive',
        '@merchant-portal',
        '@e2e-14',
        '@workflow',
        '@hybrid',
        '@deliverx',
        '@planet',
      ],
      // Flow summary: patient creates DeliverX order for Planet branch -> merchant accepts in UI ->
      // merchant uploads QR/updates prices/sends quote in UI ->
      // patient pays -> admin confirms and assigns rider -> pharmacist sets for pickup -> rider completes -> patient rates ->
      // merchant verifies COMPLETED in details and Completed tab.
    },
    async ({ page, api }) => {
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      const merchant = createMerchantPortalContext(page, { accountKey: 'e2e-planetadmin' });

      // API (patient): create DeliverX order bound to active Planet main branch.
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrder(api, {
        order: buildDeliverXHybridOrderInput({
          patientId: defaultPatientAccount.patientId,
          branchId: merchant.account.assignedBranchId,
          additionalDiscountsEnabled: true,
        }),
      });

      // UI (merchant): login and accept order.
      await merchant.loginPage.open();
      await merchant.loginPage.login(merchant.account.username, merchant.account.password);
      await merchant.loginPage.assertSuccessLogin();

      await merchant.ordersPage.open();
      await merchant.ordersPage.openNewOrderByBookingRef(bookingRef);
      await merchant.orderDetailsPage.acceptOrder();

      // UI (merchant): upload QR, update prices, and send quote.
      await merchant.orderDetailsPage.uploadQRCode(path.resolve('upload/images/qr1.png'));
      await merchant.orderDetailsPage.updatePriceItems(buildBasePriceItems());
      await merchant.orderDetailsPage.sendQuote();

      // API (patient): accept quote and pay.
      const { acceptQuoteNode } = await acceptQuoteAsPatientWhenReady(api, { patientAccessToken, orderId });
      const patientPaymentQRCodeId = acceptQuoteNode?.paymentQRCodeId;
      expect(patientPaymentQRCodeId, 'Missing paymentQRCodeId after patient accept quote').toBeTruthy();
      const { paymentQRCodeBranchId } = await ensurePatientPaymentQRCodeAccessible(api, {
        patientAccessToken,
        paymentQRCodeId: patientPaymentQRCodeId,
      });
      expect(paymentQRCodeBranchId, 'Missing branchId from patient payment QR code').toBeTruthy();
      const riderFulfillmentBranchId = merchant.account.assignedBranchId || paymentQRCodeBranchId;
      expect(riderFulfillmentBranchId, 'Missing branchId for rider fulfillment').toBeTruthy();
      await payOrderAsPatientWithProof(api, {
        patientAccessToken,
        orderId,
        proofImagePath: patientProofPaymentImagePath,
        mode: PatientPayModes.DELIVERY,
      });

      // API (admin): confirm payment.
      const { adminAccessToken } = await loginAsAdminForHybrid(api);
      await confirmPaymentAsAdminForHybrid(api, { adminAccessToken, orderId });

      // UI (merchant): prepare then set for pickup.
      await merchant.orderDetailsPage.prepareOrderForPickup();
      await merchant.orderDetailsPage.setOrderReadyForPickup();

      // API (admin): assign rider after order is ready for assignment.
      const { assignedRiderId } = await assignRiderToOrderAsAdminForHybrid(api, {
        adminAccessToken,
        orderId,
        riderId: defaultRiderAccount.riderId,
      });

      // API (rider): complete fulfillment.
      await completeDeliveryAsRiderForHybrid(api, {
        orderId,
        branchId: riderFulfillmentBranchId,
        pickupProofImagePath: riderPickupProofImagePath,
        deliveryProofImagePath: riderDeliveryProofImagePath,
      });

      // API (patient): rate rider.
      await rateRiderAsPatientForHybrid(api, {
        patientAccessToken,
        riderId: assignedRiderId || defaultRiderAccount.riderId,
      });

      // UI (merchant): verify Completed in details + Orders > Completed tab.
      await merchant.ordersPage.verifyOrderCompletedInDetailsAndCompletedTab(bookingRef);
    }
  );

  test(
    'E2E-15 | DeliverX for Planet Pharmacy Pickup Fulfillment',
    {
      tag: [
        '@ui',
        '@merchant',
        '@positive',
        '@merchant-portal',
        '@e2e-15',
        '@workflow',
        '@hybrid',
        '@deliverx',
        '@planet',
        '@pickup',
      ],
      // Flow summary: patient creates DeliverX pickup order for Planet pickup branch -> merchant accepts in UI ->
      // merchant uploads QR/updates prices/sends quote in UI -> patient pays in pickup mode -> admin confirms payment ->
      // pharmacist prepares/sets for pickup and confirms Order Picked Up in UI with pickup-success modal ->
      // merchant verifies COMPLETED in details and Completed tab.
    },
    async ({ page, api }) => {
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const merchant = createMerchantPortalContext(page, { accountKey: 'e2e-planetadmin' });
      const pickupBranchId = Number(merchant.account.pickupBranchId);
      expect(pickupBranchId, 'Missing Planet pickupBranchId for pickup fulfillment flow').toBeTruthy();

      // API (patient): create DeliverX order bound to active Planet pickup branch.
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrder(api, {
        order: buildDeliverXHybridOrderInput({
          patientId: defaultPatientAccount.patientId,
          branchId: pickupBranchId,
          additionalDiscountsEnabled: true,
        }),
      });

      // UI (merchant): login and accept order.
      await merchant.loginPage.open();
      await merchant.loginPage.login(merchant.account.username, merchant.account.password);
      await merchant.loginPage.assertSuccessLogin();

      await merchant.ordersPage.open();
      await merchant.ordersPage.openNewOrderByBookingRef(bookingRef);
      await merchant.orderDetailsPage.acceptOrder();

      // UI (merchant): upload QR, update prices, and send quote.
      await merchant.orderDetailsPage.uploadQRCode(path.resolve('upload/images/qr1.png'));
      await merchant.orderDetailsPage.updatePriceItems(buildBasePriceItems());
      await merchant.orderDetailsPage.sendQuote();

      // API (patient): accept quote and pay using pickup mode.
      const { acceptQuoteNode } = await acceptQuoteAsPatientWhenReady(api, { patientAccessToken, orderId });
      const patientPaymentQRCodeId = acceptQuoteNode?.paymentQRCodeId;
      expect(patientPaymentQRCodeId, 'Missing paymentQRCodeId after patient accept quote').toBeTruthy();
      await ensurePatientPaymentQRCodeAccessible(api, {
        patientAccessToken,
        paymentQRCodeId: patientPaymentQRCodeId,
      });
      await payOrderAsPatientWithProof(api, {
        patientAccessToken,
        orderId,
        proofImagePath: patientProofPaymentImagePath,
        mode: PatientPayModes.PICKUP,
      });

      // API (admin): confirm payment.
      const { adminAccessToken } = await loginAsAdminForHybrid(api);
      await confirmPaymentAsAdminForHybrid(api, { adminAccessToken, orderId });

      // UI (merchant): prepare, set for pickup, confirm picked up, and assert pickup-success modal.
      await merchant.orderDetailsPage.prepareOrderForPickup();
      await merchant.orderDetailsPage.setOrderReadyForPatientPickup({ dismissQR: false });
      await merchant.orderDetailsPage.confirmPatientPickupCompleted({ expectPickupSuccessfulModal: true });

      // UI (merchant): verify Completed in details + Orders > Completed tab.
      await merchant.ordersPage.verifyOrderCompletedInDetailsAndCompletedTab(bookingRef);
    }
  );
});
