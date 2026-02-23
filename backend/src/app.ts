import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import excelRoutes from './routes/excel.routes';

// Configurar variables de entorno
dotenv.config();

const app = express();

// Configurar middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/excel', excelRoutes);

// Puerto
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

export default app;