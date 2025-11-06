const https = require('https');

// Test identity creation WITH TYPE = link and name
const identityData = JSON.stringify({
  type: 'link',
  name: 'fezola test',
  email: 'fezola004@gmail.com',
  phone_number: '+2348000000000'
});

const identityOptions = {
  hostname: 'processor-prod.up.railway.app',
  path: '/identity',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-service-key': 'dEmPtv8VtfEnDOk3AcLLK59G7sdEmPtv8VtfEnDOk3',
    'Content-Length': identityData.length
  }
};

console.log('Testing Bread API Identity Creation...');
console.log('Request:', identityData);

const req = https.request(identityOptions, (res) => {
  console.log(`\nStatus Code: ${res.statusCode}`);
  console.log('Headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(identityData);
req.end();

