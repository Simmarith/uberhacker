# uberhacker
a multiplayer hacking game which makes you look like all those stupid hackers on tv (except for mr. robot!)

## Usage
### The Server
#### Linux
On the server, you simply follow these Steps:
- Clone the repo
- Get into the /client directory
- Run `npm install`

Congrats! You now have installed the server! Now start it up with `node index.js`. You have to be in the /server directory for that.

#### Windows
tutorial will be added when i got the time (or YOU could try it out and send me a pull-request with the updated readme ;D).

#### The Client
Just connect to the Server. Enter your name. For the moment, You'll just get a window thrown at you which will state what it wants. Enter the answer into the next line and then press the Enter-key. If You're right, the window will change it's contents and you will score a point. If not, nothing will happen (someone will have to add some error message on there).

### Dreaming up the future
When it's finished, you just have to connect to a "gameroom" via hostname/"gameroom"-name (I really want a better name for this ^^°)
After the game has been started by the server, you will get challenges via new windows popping up which you have to solve the fastest to get the point. Lobbys will probably have some kind of goal. Im thinking about
- a co-op mode in which you have to get to a certain value in points as fast as possible
- another co-op where you'll get an insane amount of challenges which will 'explode' in 5 seconds and
- a competitive mode where you have to reach a certain value in points first to win.

#### Server
The server is currently just serving up webpages. Later in the process, he's gonna create as much "gamerooms" as you want upon request. He runs on node.js, so he needs that on your machine to function.
