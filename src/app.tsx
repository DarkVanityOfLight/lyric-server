// Define types for the word and lyric line objects
type Word = {
    string: string;
};

type LyricLine = {
    time: number;
    words: Word[];
};

// Initialize variables for current lyrics and time, and an array of sockets
let currentLyrics: LyricLine[] | null = null;
let currentTime: number | null = null;
const sockets: Map<string, WebSocket> = new Map();
const addresses: string[] = ["127.0.0.1:5001/ws"];

// Connect to the WebSocket server at the specified address
function createConnection(address: string) {
    const socket = new WebSocket("ws://" + address);

    // When the socket is opened, register it and send the current lyrics and time
    socket.addEventListener('open', (event) => {
        registerSocket(socket, address);
    });

    // If the socket is closed, try to reconnect after a delay
    socket.onclose = function(event) {
        console.log('WebSocket is closed. Code: ' + event.code);
        sockets.delete(address)
        setTimeout(function() {
            console.log('WebSocket reconnecting...');
            createConnection(address, socket);
        }, 1000);
    };
}

// Register a socket and send the current lyrics and time
function registerSocket(socket: WebSocket, address: string) {
    sockets.set(address, socket)
    sendCurrentLyrics(socket);
    sendCurrentTime(socket)
}

// Send the current lyrics and time to a socket
function sendCurrentLyrics(socket: WebSocket) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            lyrics: currentLyrics?.length ? currentLyrics : null,
        }));
    } else {
        console.error('WebSocket connection not open.');
    }
}

function sendCurrentTime(socket: WebSocket) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            time: currentTime
        }));
    } else {
        console.error('WebSocket connection not open.');
    }
}

// Get the ID of the current track
function getCurrentTrackId(): string | null {
    if (Spicetify.Player.data?.track == undefined) {
        return null;
    }

    const trackURI = Spicetify.Player.data.track.uri;
    return getTrackId(trackURI);
}

// Fetch the lyrics for a track
function fetchLyrics(id: string): Promise<LyricLine[] | null> {
    const baseURL = "https://spclient.wg.spotify.com/lyrics/v1/track/";

    return Spicetify.CosmosAsync.get(baseURL + id)
        .then((resp) => {
            const lyrics: LyricLine[] = resp.lines;
            return lyrics;
        })
        .catch((e) => {
            console.error(`Failed to fetch lyrics for track ${id}: ${e}`);
            return null;
        });
}

async function getCurrentTrackLyrics(): Promise<LyricLine[] | null> {
    const trackId = getCurrentTrackId();
    if (trackId === null) {
        console.error('No track is currently playing.');
        return null;
    }

    return fetchLyrics(trackId);
}

function sendLyricsToAll(sockets: WebSocket[]) {
    sockets.forEach((socket) => {
        sendCurrentLyrics(socket);
    });
}

function sendTimeToAll(sockets: WebSocket[]) {
    sockets.forEach((socket) => {
        sendCurrentTime(socket);
    });
}

// Main function to be called on startup
async function main() {
    // Wait for Spicetify to load
    while (!Spicetify) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    while (Spicetify?.Player?.data?.item == null) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    currentLyrics = await getCurrentTrackLyrics()
    currentTime = Spicetify.Player.data.timestamp

    addresses.forEach(address => {
        createConnection(address);
    });

    // When the song changes, get the lyrics and send them to all sockets
    Spicetify.Player.addEventListener("songchange", async () => {
        currentLyrics = await getCurrentTrackLyrics();
        sendLyricsToAll(sockets);
    });

    // When the song progress changes, send the time to all sockets
    Spicetify.Player.addEventListener("onprogress", event => {
        if (event.data != currentTime) {
            currentTime = event.data
            sendTimeToAll(sockets);
        }
    });
}

export default main;
