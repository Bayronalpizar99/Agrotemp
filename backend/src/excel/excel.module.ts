import { Module } from '@nestjs/common';
import { ExcelController } from './excel.controller';
import { FirebaseModule } from '../modules/firebase/firebase.module';

@Module({
    imports: [FirebaseModule],
    controllers: [ExcelController]
})
export class ExcelModule {}