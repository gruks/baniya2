import 'dotenv/config';
import axios from 'axios';
import { AppDataSource } from './src/data-source';
import { UserEntity } from './src/entities/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'baniya-super-secret-key-change-in-prod';

async function testFs() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(UserEntity);
  const user = await repo.findOne({ where: {} });
  if (!user) throw new Error("No user found");
  
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  
  try {
    const res = await axios.get('http://localhost:3000/api/fs/list', {
      params: { root: 'D:\\Projects', path: '.' },
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("SUCCESS:", JSON.stringify(res.data, null, 2).slice(0, 500));
  } catch (e: any) {
    console.log("ERROR:", e.response?.data || e.message);
  }
  process.exit(0);
}

testFs().catch(console.error);
