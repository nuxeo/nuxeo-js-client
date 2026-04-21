// Log the currently running test to the Nuxeo server.
// Helps identify which test was executing when a server-side error occurs.
//
// Vitest passes a TaskContext to beforeEach; we walk task.suite to build the
// full title path (equivalent to Mocha's getParentTitles).

const getParentTitles = (task) => {
  const titles = [];
  let { suite } = task;
  while (suite) {
    if (typeof suite.name === 'string' && suite.name.trim().length > 0) {
      titles.push(suite.name.trim());
    }
    ({ suite } = suite);
  }
  return titles.reverse();
};

const nuxeo = new Nuxeo({ baseURL, auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });

beforeEach((ctx) => {
  const titles = getParentTitles(ctx.task);
  titles.push(ctx.task.name);
  const message = `>>> testing: ${titles.join(' > ')}`;
  return nuxeo.operation('Log')
    .params({ message, category: 'nuxeo-js-client', level: 'warn' })
    .execute();
});
