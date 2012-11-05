A public dsapi server
=====================
to publish datasets and images for SmartOS

The primary goal here is it to use the server with `imgadm` on SmartOS. The API is functional for that purpose and every aspect of the official API that is not needed for `imgadm` has second priority.

Version **0.0.1** is tested with `imgadm` on platform 20120809T221258Z.

Why did we build this?
----------------------
*there is already the official repository for datasets so this one is useless*

**NO** - ever tried to publish own images onto the official server? The community builds datasets from time to time and it's a bummer that those are not usable by a larger group of the community

Differences from the official dsapi
-----------------------------------
- all images on the server are public and can be downloaded by everyone
- there is only a basic authentication for uploads without a central users database
- maybe not all API methods are implemented

Info:
------

If you are using the prebuilt dataset it comes pre-configured with the following behaviour.

- It is set to synch with the public repo mirror http://datasets.l0cal.net/datasets
- It syncs every hour on the hour via cron
- By default it is only sync's manifest and not the the actual dataset files
- You can manually selectively sync only the individual dataset files you want or all the dataset files (About 19GB at present)

Usage:
------
To selectively sync a dataset:

`/opt/dsapi/bin/sync-files 78ab4d60-2610-11e2-b3f7-b3bd2c369427`

This dataset file will be added to the list for background sync and will sync the next time the hourly cron job is triggered.

To change default behaviour to sync all dataset files as well as manifests all datasets:

`/opt/dsapi/bin/add-sync-source joyent https://datasets.joyent.com/datasets -f`

Note: Only new datasets will be mirrored automatically

Version history
---------------
0.0.1: initial public version
