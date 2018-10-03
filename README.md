OriGraph
========
App for folding graphs (better description + readme coming eventually...)

# Installing
```bash
git clone https://github.com/origraph-apps/origraph.git
cd origraph
npm install
```

# Running
```bash
npm run serve
# Hit Ctrl+c to quit
```

# Developing
To work with / on un-published versions / branches of origraph.js in tandem with origraph:

```bash
# Clone and link the origraph.js library
git clone https://github.com/origraph-apps/origraph.js.git
cd origraph.js
npm install
npm link # <-- might need sudo privileges if you're not using nvm

# Replace the installed origraph library with a symlink to your local copy
cd wherever/you/installed/origraph
npm link origraph

# Copy hooks so any commits will always include the current version of the
# library, instead of the published one (so you never have broken deployments)
cp dev/* .git/hooks/
```

At this point you should be able to edit the library and the app together. To avoid having to rebuild the library for each change, you can run `npm run watchumd` in the `origraph.js` directory to auto-build any changes.
