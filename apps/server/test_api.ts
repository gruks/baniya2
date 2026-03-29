import axios from 'axios';

async function testFs() {
  let token = '';
  try {
    const regRes = await axios.post('http://localhost:3000/api/auth/register', {
      name: 'Agent',
      email: `agent_${Date.now()}@baniya.ai`,
      password: 'mypassword123'
    });
    token = regRes.data.token;
    console.log("Registered agent. Token:", token.slice(0, 10) + '...');
  } catch (e: any) {
    console.log("Register failed:", e.response?.data || e.message);
    try {
      const logRes = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'test@baniya.ai', // fallback
        password: 'password'
      });
      token = logRes.data.token;
    } catch {}
  }

  if (!token) {
    console.log("Failed to get token");
    process.exit(1);
  }

  const rootsToTest = [
    'C:\\Projects',
    '.',
    'e:\\Projects',
    '/'
  ];

  for (const root of rootsToTest) {
    try {
      const res = await axios.get('http://localhost:3000/api/fs/list', {
        params: { root, path: '.' },
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`[${root}] SUCCESS! Items:`, res.data.items?.length);
    } catch (e: any) {
      console.log(`[${root}] ERROR:`, e.response?.data?.error || e.message);
    }
  }
}

testFs().catch(console.error);
