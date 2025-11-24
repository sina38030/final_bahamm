#!/usr/bin/env node

/**
 * Script to check if required environment variables are set for production
 * Usage: node check-env.js
 */

console.log('🔍 Checking environment variables...\n');

const required = {
  'Backend URL (one required)': [
    'BACKEND_URL',
    'INTERNAL_BACKEND_URL',
    'API_BASE_URL'
  ],
  'Frontend URL (recommended)': [
    'SITE_URL',
    'FRONTEND_URL',
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_FRONTEND_URL'
  ],
  'Public API (client-side)': [
    'NEXT_PUBLIC_ADMIN_API_URL'
  ]
};

let hasErrors = false;
let hasWarnings = false;

console.log('📋 Environment Variables Status:\n');

for (const [category, vars] of Object.entries(required)) {
  console.log(`\n${category}:`);
  
  const setVars = vars.filter(v => process.env[v]);
  const isBackend = category.includes('Backend');
  const isRequired = category.includes('required');
  
  if (setVars.length === 0 && isRequired) {
    console.log(`  ❌ MISSING: None of these are set: ${vars.join(', ')}`);
    hasErrors = true;
  } else if (setVars.length === 0 && !isRequired) {
    console.log(`  ⚠️  WARNING: None of these are set: ${vars.join(', ')}`);
    hasWarnings = true;
  } else {
    vars.forEach(v => {
      const value = process.env[v];
      if (value) {
        // Mask sensitive parts of URLs
        const masked = value.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
        console.log(`  ✅ ${v} = ${masked}`);
      } else {
        console.log(`  ⚪ ${v} = not set`);
      }
    });
  }
}

console.log('\n' + '='.repeat(60));

if (hasErrors) {
  console.log('\n❌ ERROR: Required environment variables are missing!');
  console.log('\nThe track page will NOT work in production.');
  console.log('\nPlease set at least one of: BACKEND_URL, INTERNAL_BACKEND_URL, or API_BASE_URL');
  console.log('\nSee TRACK_PAGE_PRODUCTION_FIX.md for detailed instructions.');
  process.exit(1);
} else if (hasWarnings) {
  console.log('\n⚠️  WARNING: Some recommended variables are not set.');
  console.log('\nThe app might work, but some features may not function properly.');
  process.exit(0);
} else {
  console.log('\n✅ All environment variables are properly configured!');
  console.log('\nYour track page should work correctly in production.');
  process.exit(0);
}




