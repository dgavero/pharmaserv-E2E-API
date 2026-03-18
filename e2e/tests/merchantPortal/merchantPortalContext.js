import MerchantPortalLoginPage from '../../pages/merchantPortal/merchantPortalLogin.page.js';
import MerchantOrdersPage from '../../pages/merchantPortal/merchantOrders.page.js';
import MerchantOrderDetailsPage from '../../pages/merchantPortal/merchantOrderDetails.page.js';
import { getMerchantPortalAccount } from '../../helpers/merchantCredentials.js';

export function createMerchantPortalContext(page, { accountKey = 'e2e-reg01' } = {}) {
  return {
    account: getMerchantPortalAccount(accountKey),
    loginPage: new MerchantPortalLoginPage(page),
    ordersPage: new MerchantOrdersPage(page),
    orderDetailsPage: new MerchantOrderDetailsPage(page),
  };
}
