const express = require('express');
const { getReport, getUserWiseReport, exportExcel, exportPDF } = require('../controllers/reportsController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('OWNER'));

router.get('/', getReport);
router.get('/user-wise', getUserWiseReport);
router.get('/export/excel', exportExcel);
router.get('/export/pdf', exportPDF);

module.exports = router;
