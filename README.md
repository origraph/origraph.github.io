OriGraph
========
App for folding graphs (better description / readme coming eventually...)

# Simple Installation
=====================

```bash
git clone https://github.com/mure-apps/origraph.git
cd origraph
npm install
```

# Running
=========

```bash
npm run serve
# Hit Ctrl+c to quit
```

# Hard Core Development
=======================
To work with/on un-published versions / branches of mure.js in tandem with origraph:

```bash
# Clone and link the mure.js library
git clone https://github.com/mure-apps/mure-library.git
cd mure-library
npm install
npm run watchumd
npm link # <-- might need sudo privileges if you're not using nvm

# Replace the installed mure library with a symlink to your local copy
cd wherever/you/installed/origraph
npm link mure

# Copy hooks so any commits will always include the current version of the
# library, instead of the published one (so you never have broken deployments)
cp dev/* .git/hooks/
```

At this point you should be able to edit the library and the app together
