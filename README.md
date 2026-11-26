# White House Games

Start the game with Node.js 20 or newer. Run npm ci, then npm start, and open http://localhost:4173. The Node server serves the pinned Three.js and Rapier packages locally. Everything visible and audible in the game is generated in code. The browser requires WebGL 2.

Each UTC day generates a point-to-point rally with a new seed. The browser and server run the same Rapier code at 60 ticks per second. The server verifies the full input sequence before ranking and stores up to 50 runs per day, one best time per browser identity. Verification proves the input sequence can finish the course. It does not establish whether the inputs came from a person.

The default store is scores-rapier-v9.json. To use Firestore, install optional dependencies, set FIREBASE_PROJECT_ID, and configure Google Application Default Credentials on the server. The Firestore emulator can be selected with FIRESTORE_EMULATOR_HOST. The Rapier leaderboard uses a new collection so earlier physics replays remain separate.

Use WASD or arrows, Shift while steering to drift, and Space to jump. At low speed hold brake to reverse. The touch buttons use the same controls. Choose Sound on to start procedural audio. A daily leader ghost becomes available after the first verified run.

The original procedural background composition, “Village Miles,” is released under CC0 1.0 Universal (https://creativecommons.org/publicdomain/zero/1.0/). This dedication applies to the background composition, including its generated performance.

On mobile, drag the left joystick up to accelerate, down to brake or reverse, and sideways to steer. Diagonal input combines steering and throttle. Use the separate right-hand Jump and Drift buttons while driving.
