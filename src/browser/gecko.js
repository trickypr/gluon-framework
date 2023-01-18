// @ts-check

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import StartBrowser from "../launcher/start.js";

export default async function (
  { browserPath, dataPath },
  { url, windowSize },
  extra
) {
  /**
   * @param {string} path
   * @param {string} contents
   * @returns {Promise<*>}
   */
  const writePackageFile = (path, contents) =>
    writeFile(join(dataPath, path), contents);

  await mkdir(dataPath, { recursive: true });

  // Create directory structure. Should be something like this
  // app
  // | chrome
  // | | >index.html
  // | | >index.js
  // | defaults
  // | | preferences
  // | | | >prefs.js
  // | >application.ini
  // | >chrome.manifest
  await mkdir(join(dataPath, "app/chrome/content"), { recursive: true });
  await mkdir(join(dataPath, "app/defaults/preferences"), { recursive: true });

  // Now we get to create each file as we go. I will explain the the contents as
  // I go along, because this might not be the most logical

  // application.ini
  // This provides information about the application and what version of gecko
  // we want it to be able to run on.
  await writePackageFile(
    "app/application.ini",
    `
[App]
Vendor=GluonFramework
Name=GluonApp
version=1.0
BuildID=20230118
ID=something@example.com

[Gecko]
MinVersion=80.* # Who is really going to want to use something older?
MaxVersion=999.* # Sufficiently far in the future for everyone to forget it exists :)
`
  );

  // chrome.manifest
  // This file specifies the location of resources in the chrome:// protocol used
  // by firefox for application content. Surprisingly, Mozilla still has
  // documentation for this, so I don't have to reverse engineer it:
  // https://firefox-source-docs.mozilla.org/build/buildsystem/chrome-registration.html
  //
  // We aren't going to use any of the fancy features, just define a directory
  // to contain our container code. The statement below maps the contents of the
  // `app/chrome/` folder to `chrome://gluon-framework/content/`
  await writePackageFile(
    "app/chrome.manifest",
    "content gluon-framework chrome/"
  );

  // defaults/preferences/prefs.js
  // The same as user.js in regular firefox. It is located here for reasons I
  // don't understand, but it matches up with the firefox application package,
  // so it is supported I guess
  //
  // For reference, in firefox, this is stored inside of `omni.ja`, but that is
  // just a zip file which follows the same structure as what we are building
  // here (mostly)
  //
  // TODO: These prefs are stolen from the firefox version. Lots won't apply here
  await writePackageFile(
    "app/defaults/preferences/prefs.js",
    `
// TODO: Docs
pref('toolkit.defaultCrhomeURI', '${url}');
`
  );

  // app/chrome/index.html
  //
  // Now the fun part begins. We need to emulate just enough functionality using
  // a combination of internal Mozilla APIs and regular HTML to build the shell
  // to execute our application within.
  //
  // TODO: What is the contents or is it unnessisary?
  await writePackageFile(
    "app/chrome/index.html",
    `
<?xml version="1.0"?>

<?xml-stylesheet href="chrome://global/skin/" type="text/css"?>

  
  <h1>Hello world!</h1>`
  );

  return await StartBrowser(
    browserPath,
    [
      `-app`,
      join(dataPath, "app/application.ini"),
      ...(!windowSize ? [] : [`-window-size`, windowSize.join(",")]),
      `-profile`,
      dataPath,
      `-new-instance`,
    ],
    "websocket",
    extra
  );
}
