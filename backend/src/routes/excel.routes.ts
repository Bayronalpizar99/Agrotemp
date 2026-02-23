import { Router } from 'express';
import { downloadExcel } from '../controllers/excel.controller';

const router = Router();

router.get('/download', downloadExcel);

export default router;