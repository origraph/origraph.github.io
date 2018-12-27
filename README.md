OriGraph
========
Origraph is a tool for wrangling graph data. See the [deployed application](https://origraph.github.io) for more details.

# Installing
```bash
git clone https://github.com/origraph/origraph.github.io.git
cd origraph.github.io
npm install
```

# Running
```bash
npm run serve
# Hit Ctrl+c to quit
```

# Developing the library or plugins
Much of the functionality of this app is independent; we rely on the [origraph.js](https://github.com/origraph/origraph.js) library and plugins, and this repository is mostly focused on the general visual interface.

If you're creating a new plugin, you should add it to `package.json` in this repository, and run `npm install`. You should also follow the pattern in `.gitignore` to ensure your plugin's bundled file(s) are committed, and make sure to link to your files from `index.html`;

Each plugin should have a `hooks` directory—to work on a plugin or the library in conjunction with this repository, follow the directions in `hooks/README.md` for a more seamless development experience.
