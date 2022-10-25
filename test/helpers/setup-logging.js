(() => {
  const getParentTitles = (currentTest) => {
    const titles = [];
    let { parent } = currentTest;
    while (parent) {
      if (typeof parent.title === 'string' && parent.title.trim().length > 0) {
        titles.push(parent.title.trim());
      }
      ({ parent } = parent);
    }
    return titles.reverse();
  };

  const nuxeo = new Nuxeo({ baseURL, auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });

  // Log on the server the running test
  beforeEach(function f(done) {
    const { currentTest } = this;
    const titles = getParentTitles(currentTest);
    titles.push(currentTest.title);
    const message = `>>> testing: ${titles.join(' > ')}`;
    nuxeo.operation('Log')
      .params({ message, category: 'nuxeo-js-client', level: 'warn' }).execute()
      .then(() => done())
      .catch((e) => done(e));
  });
})();
