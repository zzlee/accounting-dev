const { performance } = require('perf_hooks');

const itemCategoryId = '1, 2, 3, a, 4, 5, b, 6, 7, 8, c, 9, 10'.repeat(100);

function original() {
  return itemCategoryId.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
}

function optimized_reduce() {
  return itemCategoryId.split(',').reduce((acc, idStr) => {
    const id = Number(idStr.trim());
    if (!isNaN(id)) acc.push(id);
    return acc;
  }, []);
}

const ITERATIONS = 10000;

let start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  original();
}
let end = performance.now();
console.log(`Original: ${end - start} ms`);

start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  optimized_reduce();
}
end = performance.now();
console.log(`Optimized reduce: ${end - start} ms`);
