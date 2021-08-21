# eventDomain

This service relays socket and http events between the Lightning.Page PWA and user node API daemons, allowing communication between the PWA and API to remain E2E encrypted while also providing for SSL features required by most browesrs. 

API's are issued a persistent token to address themselves to the PWA, allowing the service to scale horizontally once a control plane is implemented.

A production instance is available at `tunnel.rip`

### Usage

Use behind a reverse proxy such as `Caddy` with wildcard certificate

`git clone https://github.com/shocknet/eventDomain`

`cd eventDomain && npm install`

`node main.js`
