const { execSync } = require('child_process');
const { writeFileSync } = require('fs');

const version = require('./package.json').version;
const sha1 = execSync('git rev-parse --short HEAD').toString().trim();

const content = `
export const VERSION = '${version}';
export const SHA1 = '${sha1}';
`;

writeFileSync('./environments/carte.ts', content, { encoding: 'utf8' });
console.log(`Version ${version} - SHA1 ${sha1}`);
