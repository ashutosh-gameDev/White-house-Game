import http from 'node:http';
import {handleRequest} from './rally-handler.js';

const port=Number(process.env.PORT??4173);
http.createServer(handleRequest).listen(port,process.env.HOST??'127.0.0.1',()=>{
 console.log('White House Games listening on port '+port);
});
