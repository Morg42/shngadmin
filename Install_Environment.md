# Install Environment

This is a short guide to install the environment to build the **shngadmin** application.

The Node Version Manager **nvm** is needed to install **Node.js** at first step.
Current version at development time is v25.6.0, the code should run from v22 on. 

```
# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"

# Download and install Node.js:
nvm install 25

# Verify the Node.js version:
node -v # Should print "v25.6.0".
nvm current # Should print "v25.6.0".

# Verify npm version:
npm -v # Should print "11.8.0".
```

Then download source files for shngadmin from repository

```
mk shngadmin
cd shngadmin
git clone https://github.com/smarthomeNG/shngadmin.git .
``` 

The repo brings a ``package.json`` with all needed packages. Run ``npm install`` to set it all up.
There might be warnings about peer packages not being provided. Just ignore them at first.

# Test drive!

Having all packages installed we can start a development server with

``ng serve``

This runs a server with test data on ``http://localhost:4200``

(Omitting the NODE_OPTIONS setting for openssl above will result in an error)


# Build a distribution of shngadmin


``NODE_OPTIONS="--trace-deprecation --trace-warnings" ng build --configuration production --aot --base-href /admin/``

To be used with SmartHomeNG, shngadmin needs to be included in the **static** folder of the module **admin**
copy the contents of the newly created ``dist`` folder to the **static** folder of module **admin**


# Hints

Different versions of Node can be changed with the Node Version Manager nvm.

``nvm install 22`` will setup and install the latest Node 22 Package

``nvm use 29`` will switch current used Node version to 25.

## ng update <package>

This command will update the given packages and usually scans if some changes are to be done within the code. It is highly advised to upgrade packages together that also are dependent on each other. 
E.g. ``ng update @ngx-translate/core@14 @ngx-translate/http-loader@7``

# Updating to the next Angular version

**primeng** will change with every Angular version so it needs to be checked and updated always.
**@fortawesome/angular-fontawesome** see required versiobs at https://www.npmjs.com/package/@fortawesome/angular-fontawesome
**@ngx-translate/core** + **@ngx-translate/http-loader** compatability table found at https://github.com/ngx-translate/core#installation

Update **version** of shngadmin in both ``.\package.json`` and also ``.\src\app\app.component.ts``
