import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

await connectDB(process.env.MONGO_URI);
app.listen(process.env.PORT, () =>
  console.log(`API running on http://localhost:${process.env.PORT}`)
);