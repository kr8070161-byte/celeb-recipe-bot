async function run() {
  const repo = 'kr8070161-byte/celeb-recipe-bot';
  console.log(`Fetching latest workflow runs for ${repo}...`);
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=1`);
    const data = await res.json();
    if (data.workflow_runs && data.workflow_runs.length > 0) {
      const run = data.workflow_runs[0];
      console.log(`Run ID: ${run.id}`);
      console.log(`Status: ${run.status}`);
      console.log(`Conclusion: ${run.conclusion}`);
      console.log(`Event: ${run.event}`);
      console.log(`HTML URL: ${run.html_url}`);
      console.log(`Jobs URL: ${run.jobs_url}`);
      
      const jobsRes = await fetch(run.jobs_url);
      const jobsData = await jobsRes.json();
      if (jobsData.jobs && jobsData.jobs.length > 0) {
        const job = jobsData.jobs[0];
        console.log(`Job Name: ${job.name}`);
        console.log(`Steps:`);
        job.steps.forEach(s => {
          console.log(` - ${s.name}: ${s.status} (${s.conclusion})`);
        });
      }
    } else {
      console.log('No workflow runs found.');
    }
  } catch (err) {
    console.error('Error fetching logs:', err.message);
  }
}

run();
