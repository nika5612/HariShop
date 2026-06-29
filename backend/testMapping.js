import dotenv from 'dotenv';
dotenv.config();

import { getMergedProvinces } from './services/shipping/locationMapping.js';

(async () => {
  try {
    console.log('Testing getMergedProvinces...');
    const result = await getMergedProvinces();
    console.log('Total returned:', result.length);
    console.log('Sample:', result.slice(0, 2));
  } catch(e) {
    console.error('Error:', e);
  }
})();
