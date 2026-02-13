const { execSync } = require('child_process');
const { writeFileSync } = require('fs');

function getCommits() {
	const log = execSync(`git log -n 50 --pretty=format:"%h|%an|%ad|%s" --date=iso-strict`)
		.toString()
		.split('\n')
		.map(line => {
			const [hash, author, date, message] = line.split('|');
			return { hash, author, date, message };
		});
	return log;
}

const commits = getCommits();
writeFileSync('./public/commits.json', JSON.stringify(commits));
console.log('✅ commits.json généré avec succès');
