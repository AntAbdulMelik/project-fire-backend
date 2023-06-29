import express from 'express';

import verifyTokenMiddleware from '../middleware/verifyTokenMiddleware';
import * as invoicesController from '../controllers/invoicesController';

const router = express.Router();

router.use(verifyTokenMiddleware);

router.get('/', invoicesController.getInvoices);
router.get('/:invoiceId', invoicesController.getInvoiceById);
router.post('/', invoicesController.createInvoice);
router.patch('/:invoiceId', invoicesController.updateInvoice);
router.delete('/:invoiceId', invoicesController.deleteInvoice);

export default router;
