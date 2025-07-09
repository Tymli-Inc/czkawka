// Simple test to check YouTube categorization
const { CategoryManager } = require('./src/electron/categoryManager');

async function testYouTubeCategory() {
    console.log('Testing YouTube categorization...');
    
    const categoryManager = CategoryManager.getInstance();
    
    // Test different YouTube domains
    const testDomains = [
        'youtube.com',
        'www.youtube.com',
        'youtube',
        'YouTube',
        'YOUTUBE.COM'
    ];
    
    testDomains.forEach(domain => {
        const category = categoryManager.categorizeItem(domain);
        console.log(`Domain: ${domain} -> Category: ${category}`);
    });
}

testYouTubeCategory();
