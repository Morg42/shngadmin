# Install Environment

This is a short guide to install the environment to build the **shngadmin** application.

The Node Version Manager **nvm** is needed to install **Node.js** at first step.
Current version at development time is v25.2.1, the code should run from v22 on.

```
# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"

# Download and install Node.js:
nvm install 25

# Verify the Node.js version:
node -v # Should print something like "v25.2.1" (nvm always installs the latest patch of the requested major).
nvm current # Should match.

# Verify npm version:
npm -v # Should print something like "11.6.2".
```

Then download source files for shngadmin from repository

```
mkdir shngadmin
cd shngadmin
git clone https://github.com/smarthomeNG/shngadmin.git .
```

The repo brings a ``package.json`` with all needed packages. Run ``npm install`` to set it all up.
There might be warnings about peer packages not being provided. Just ignore them at first.

# Test drive!

Having all packages installed we can start a development server with

``npm start``

(equivalent to running ``ng serve`` directly)

This runs a server with test data on ``http://localhost:4200``

By default it proxies API/WebSocket calls to whatever SmartHomeNG instance is configured in
``proxy.conf.js`` — edit the ``PROXY_TARGET`` constant near the top of that file to point at your
own SmartHomeNG server before starting the dev server.

# Build a distribution of shngadmin

``npm run build:prod``

This does three things: stamps the build with a version string derived from ``package.json`` plus
the current git commit/branch (``scripts/generate-version.js``), runs a production build via
``ng build --configuration=production``, and copies the generated ``3rdpartylicenses.txt`` into
``src/assets/`` so it's available at runtime on the System page's licensing tab.

Output goes to ``dist/static/browser/``. Note that ``npm run build:prod`` builds with the default
base href (``/``) — it does not pass ``--base-href``. For a deployment under a subpath (e.g. the
``/admin/`` mount point SmartHomeNG normally serves this app from), run the equivalent manually
instead: ``node scripts/generate-version.js && ng build --configuration production --base-href /admin/``.

To be used with SmartHomeNG, shngadmin needs to be included in the **static** folder of the module **admin**:
copy the contents of ``dist/static/browser/`` to the **static** folder of module **admin**.

# Hints

Different versions of Node can be changed with the Node Version Manager nvm.

``nvm install 22`` will download and install the latest Node 22 release.

``nvm use 22`` will switch the currently active Node version to 22.

## ng update <package>

This command will update the given packages and usually scans if some changes are to be done within the code. It is highly advised to upgrade packages together that also are dependent on each other.
E.g. ``ng update @ngx-translate/core@17 @ngx-translate/http-loader@16``

# Updating to the next Angular version

Angular only supports updating one major version at a time (e.g. 20 → 21, not 20 → 22 directly) — run
``ng update`` first to see what it recommends, then follow the sequence it proposes.

**primeng** will change with every Angular version so it needs to be checked and updated always. Note
that a matching PrimeNG release doesn't always exist yet the day a new Angular major ships — check
``npm view primeng@latest version`` (and compare against ``npm view primeng versions`` for a
release-candidate) before assuming it's ready; the same applies to **@angular/cdk**, which PrimeNG
itself pins a peer range against.

**@fortawesome/angular-fontawesome** — check the required version at
https://www.npmjs.com/package/@fortawesome/angular-fontawesome (its peer range on ``@angular/core``
is usually pinned to one specific major, so it needs bumping in lockstep with Angular; the
``@fortawesome/fontawesome-svg-core`` and icon packages like ``@fortawesome/free-solid-svg-icons``
may need a matching major bump too).

**@ngx-translate/core** + **@ngx-translate/http-loader** compatibility table found at
https://github.com/ngx-translate/core#installation

Update **version** in ``.\package.json`` (the ``version``/``internalVersion`` fields) — there is
nothing to update by hand in ``app.component.ts`` or anywhere else; ``scripts/generate-version.js``
regenerates the app's displayed version string from ``package.json`` plus the current git commit and
branch automatically on every build/serve.
