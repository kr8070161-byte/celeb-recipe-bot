async function run() {
  const repo = 'kr8070161-byte/celeb-recipe-bot';
  const runId = '29017648100';
  console.log(`Fetching jobs for run ${runId}...`);
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs`);
    const data = await res.json();
    if (data.jobs && data.jobs.length > 0) {
      const jobId = data.jobs[0].id;
      console.log(`Job ID: ${jobId}`);
      
      console.log(`Fetching logs for job ${jobId}...`);
      // Note: Actions logs redirect to a text file download. We need to handle redirect.
      const logRes = await fetch(`https://api.github.com/repos/${repo}/actions/jobs/${jobId}/logs`);
      const logText = await logRes.text();
      console.log('--- LOGS START ---');
      // Print the last 150 lines of logs
      const lines = logText.split('\n');
      console.log(lines.slice(-150).join('\n'));
      console.log('--- LOGS END ---');
    } else {
      console.log('No jobs found.');
    }
  } catch (err) {
    console.error('Error fetching logs:', err.message);
  }
}

run();
