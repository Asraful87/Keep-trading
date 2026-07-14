fetch('http://localhost:3000/').then(r => r.text()).then(t => {
  console.log('connMsg span:', t.includes('id="connMsg"'));
  console.log('auth-verified msg:', t.includes('must match .env'));
  console.log('loading msg:', t.includes('Loading channels'));
}).catch(e => console.log('ERR', e.message));
