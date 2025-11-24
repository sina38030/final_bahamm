// Run this in browser console to clear payment cache
console.log('🧹 Clearing payment cache...');

let count = 0;
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('processed_')) {
    console.log('  Removing:', key);
    localStorage.removeItem(key);
    count++;
  }
});

console.log(`✅ Cleared ${count} cached payment entries`);
console.log('🔄 Please make a NEW solo purchase now');


