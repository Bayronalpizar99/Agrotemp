import { Module } from '@nestjs/common';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
    imports: [FirebaseModule],
    controllers: [WeatherController],
    providers: [WeatherService],
    exports: [WeatherService]
})
export class WeatherModule {}