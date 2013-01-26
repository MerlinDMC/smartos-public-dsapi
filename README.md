A public dsapi server
=====================
to publish datasets and images for SmartOS

The primary goal here is it to use the server with `imgadm` on SmartOS. The API is functional for that purpose and every aspect of the official API that is not needed for `imgadm` has second priority.

Version **0.1.1** is tested with `imgadm` on platform 20130125T031721Z.

Why did we build this?
----------------------
*there is already the official repository for datasets so this one is useless*

**NO** - ever tried to publish own images onto the official server? The community builds datasets from time to time and it's a bummer that those are not usable by a larger group of the community

Differences from the official dsapi
-----------------------------------
- all images on the server are public and can be downloaded by everyone
- there is only a basic authentication for uploads without a central users database
- maybe not all API methods are implemented

Version history
---------------
0.1.1: renamed special attributes  
0.1.0: host readme file alongside datasets  
0.0.1: initial public version  
