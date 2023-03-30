## lyric-server
This is a spicetify plugin that serves lyrics via a websocket to all registered clients.

## Setup
- Clone this Repo
- Modify the src/app.tsx file
- Add/remove addresses to the addresses array or use the default one (127.0.0.1:5001/ws)
- Run `yarn run build`
- Run `spicetify config extensions lyric-server.js`
- Run `spicetify apply`
- Have fun with it


## Made with Spicetify Creator
- https://github.com/spicetify/spicetify-creator
