OriGraph
========
App for folding graphs (better description / readme coming eventually...)

# Simple Installation
```bash
npm install
npm run serve
```

# Hard Core Development
To work with /on un-published versions / branches of mure.js in tandem with origraph:

```bash
git clone https://github.com/mure-apps/mure-library.git
cd mure-library
npm install
npm run watchumd
npm link # <-- might need sudo privileges if you're not using nvm
cd ..

git clone https://github.com/mure-apps/origraph.git
cd origraph
npm install
npm link mure
npm run serve
```

At this point you should be able to edit the library and the app together
