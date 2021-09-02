# eventDomain

This service relays socket and http events between the Lightning.Page PWA and user node API daemons, allowing communication between the PWA and API to remain E2E encrypted while also providing for SSL features required by most browesrs. 

API's are issued a persistent token to address themselves to the PWA, allowing the service to scale horizontally once a control plane is implemented.

A production instance is available at `tunnel.rip`

### Usage

Use behind a reverse proxy such as `Caddy` with wildcard certificate

`git clone https://github.com/shocknet/eventDomain`

`cd eventDomain && npm install`

`node main.js`

### Caddy Configuration
Here's a sample configuration for Caddy to reverse proxy requests to eventDomain
service running on port `1234`:
```
{
  auto_https off
}
example.com, *.example.com {
  tls /etc/letsencrypt/live/example.com/fullchain.pem /etc/letsencrypt/live/example.com/privkey.pem
  reverse_proxy 127.0.0.1:1234
  log {
    output file /var/log/caddy/access.log
  }
}
```
Remember to create `/var/log/caddy/access.log` file and give it write permissions,
and also create a custom SSL certificate using `certbot` as described in the section below.
#### Wildcard SSL
To use `eventDomain` service behind SSL you need to also issue certificates for
wildcard domains such as `*.example.com`. In order to issue a certificate and ACME
challenge, you need to use a custom certbot command:
```
sudo certbot certonly --manual --preferred-challenges dns --debug-challenges -d "*.example.com" -d example.com -v
```
