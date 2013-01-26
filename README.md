A public dsapi server
=====================
A dataset server to publish datasets and images for SmartOS

The objective is a fully functional private dataset server that can be used via `imgadm` on SmartOS. The API has been designed solely for interoperability with `imgadm` for the purposes of Dataset serving. At the moment all other functionality has second priority but may be implemented in the future.

Version **0.1.1** is tested with `imgadm` on platform 20130125T031721Z.

Why did we build this?
----------------------
*You may say "there is already the official repository for datasets" so why build another one?*

**NO This is not the case** - The official repository does not support uploading of your own datasets or sharing community created datasets with others. Now with "dsapi" you can host your own Datasets and share them with the other SmartOS community members.

Differences from the official dsapi
-----------------------------------
- All images on the server are public and can be downloaded by everyone
- It supports only a basic authentication mechanism for uploads without requiring a central users database
- Currently not all API methods are implemented

Info:
------

If you are using the prebuilt dataset it comes pre-configured with the following behaviour.

- It syncs every hour on the hour via cron
- By default it is only sync's manifest and not the the actual dataset files
- You can manually selectively sync only the individual dataset files you want or all the dataset files (About 19GB at present)

Usage:
------
####To selectively sync a dataset:

`/opt/dsapi/bin/sync-files 78ab4d60-2610-11e2-b3f7-b3bd2c369427`

This dataset file will be added to the list for background sync and will sync the next time the hourly cron job is triggered.

####To change default behaviour to sync all dataset files as well as manifests:

`/opt/dsapi/bin/add-sync-source joyent https://datasets.joyent.com/datasets -f`

Note: Only new datasets will be mirrored automatically

####To upload a new dataset:

This can be pushed via curl e.g.

    curl -X PUT -u user:pass http://datasets.at/datasets/add7270a-df59-11e1-8214-b7162f4afb5e -F manifest=@arch-minimal-20120804-0.0.1.dsmanifest -F arch-minimal-20120804-0.0.1.zfs.bz2=@arch-minimal-20120804-0.0.1.zfs.bz2

####To set a username and password for dataset uploads:

`/opt/dsapi/bin/grant-upload username password`

Version history
---------------
0.1.1: renamed special attributes  
0.1.0: host readme file alongside datasets  
0.0.1: initial public version  
