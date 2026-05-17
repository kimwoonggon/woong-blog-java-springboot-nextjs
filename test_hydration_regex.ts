
const stripHtmlWrappers = (content: string): string => {
    return content
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<\s*\/?\s*html(?!-)(?:\s[^>]*)?>/gi, '')
        .replace(/<\s*\/?\s*head(?:\s[^>]*)?>/gi, '')
        .replace(/<\s*\/?\s*body(?:\s[^>]*)?>/gi, '')
}

const testCases = [
    { input: '<html><body><p>Test</p></body></html>', expected: '<p>Test</p>' },
    { input: '<!DOCTYPE html><html><head></head><body>Content</body></html>', expected: 'Content' },
    { input: '<  html  >Content<  /  html  >', expected: 'Content' },
    { input: '<html lang="en">Content</html>', expected: 'Content' },
    { input: '<html-snippet>Keep me</html-snippet>', expected: '<html-snippet>Keep me</html-snippet>' },
    { input: '<div><html-snippet html="..."></html-snippet></div>', expected: '<div><html-snippet html="..."></html-snippet></div>' },
    { input: '< html >', expected: '' },
    { input: '< html-snippet >', expected: '< html-snippet >' } // Should be preserved (whitespace inside tag name usually invalid but if user typed it...)
];

console.log('Running Regex Tests...');
let passed = 0;
testCases.forEach((test, index) => {
    const result = stripHtmlWrappers(test.input);
    // basic trimming for comparison if needed, but regex replaces with empty string so exact match expected
    if (result.replace(/\s+/g, '').trim() === test.expected.replace(/\s+/g, '').trim()) {
        console.log(`Test ${index + 1}: PASS`);
        passed++;
    } else {
        console.log(`Test ${index + 1}: FAIL`);
        console.log(`  Input:    '${test.input}'`);
        console.log(`  Expected: '${test.expected}'`);
        console.log(`  Actual:   '${result}'`);
    }
});

if (passed === testCases.length) {
    console.log('All tests passed!');
} else {
    console.log(`${testCases.length - passed} tests failed.`);
}
