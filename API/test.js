const test = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@bank.com', password: 'AdminPass1!' })
    });
    const data = await res.json();
    console.log('Login Result:', data);

    if (data.token) {
      const dbRes = await fetch('http://localhost:3000/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      const dbData = await dbRes.json();
      console.log('Dashboard Result:', dbData);
    }
  } catch (err) {
    console.error('Test Failed:', err);
  }
};
test();
